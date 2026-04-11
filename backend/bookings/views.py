import uuid
import base64
import io

import qrcode
from django.http import JsonResponse

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from .models import (
    Hall,
    Movie,
    Reservation,
    ReservedSeat,
    Screening,
    Seat,
    SeatHold,
)
from .permissions import IsAdminOrReadOnly
from .serializers import (
    HallSerializer,
    MovieSerializer,
    ReservationCreateSerializer,
    ReservationSerializer,
    ReservedSeatSerializer,
    ScreeningSerializer,
    SeatSerializer,
)
from .utils import broadcast_screening_update


class MovieViewSet(viewsets.ModelViewSet):
    queryset = Movie.objects.all().order_by("title")
    serializer_class = MovieSerializer
    permission_classes = [IsAdminOrReadOnly]


class HallViewSet(viewsets.ModelViewSet):
    queryset = Hall.objects.all().order_by("name")
    serializer_class = HallSerializer
    permission_classes = [IsAdminOrReadOnly]


class SeatViewSet(viewsets.ModelViewSet):
    queryset = Seat.objects.all()
    serializer_class = SeatSerializer
    permission_classes = [IsAdminOrReadOnly]


class ScreeningViewSet(viewsets.ModelViewSet):
    queryset = Screening.objects.select_related("movie", "hall").order_by("start_time")
    serializer_class = ScreeningSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=True, methods=["get"], url_path="seat-map", permission_classes=[AllowAny])
    def seat_map(self, request, pk=None):
        screening = self.get_object()
        client_id = request.headers.get("X-Client-Id", "")

        SeatHold.objects.filter(
            screening=screening,
            expires_at__lte=timezone.now(),
        ).delete()

        reserved_ids = set(screening.reserved_seats.values_list("seat_id", flat=True))
        active_holds = SeatHold.objects.filter(
            screening=screening,
            expires_at__gt=timezone.now(),
        )
        held_map = {hold.seat_id: hold.held_by for hold in active_holds}

        seats = Seat.objects.filter(hall=screening.hall).order_by("row", "number")

        data = []
        for seat in seats:
            held_by = held_map.get(seat.id)
            data.append(
                {
                    "id": seat.id,
                    "row": seat.row,
                    "number": seat.number,
                    "is_reserved": seat.id in reserved_ids,
                    "is_held": held_by is not None,
                    "held_by_me": bool(client_id and held_by == client_id),
                }
            )

        return Response(
            {"screening_id": screening.id, "hall_id": screening.hall_id, "seats": data}
        )

    @action(detail=True, methods=["post"], url_path="hold", permission_classes=[AllowAny])
    def hold(self, request, pk=None):
        screening = self.get_object()
        client_id = request.data.get("client_id")
        seat_ids = request.data.get("seat_ids", [])

        if not client_id or not isinstance(seat_ids, list) or not seat_ids:
            return Response(
                {"detail": "client_id and seat_ids are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        SeatHold.objects.filter(
            screening=screening,
            expires_at__lte=timezone.now(),
        ).delete()

        hall_seat_ids = set(
            Seat.objects.filter(hall=screening.hall, id__in=seat_ids).values_list("id", flat=True)
        )
        if len(hall_seat_ids) != len(set(seat_ids)):
            return Response(
                {"detail": "One or more seats do not belong to the screening hall."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        already_reserved = set(
            screening.reserved_seats.filter(seat_id__in=seat_ids).values_list("seat_id", flat=True)
        )
        if already_reserved:
            return Response(
                {"detail": "One or more seats are already reserved.", "seat_ids": list(already_reserved)},
                status=status.HTTP_409_CONFLICT,
            )

        hold_seconds = int(
            getattr(settings, "SEAT_HOLD_SECONDS", int(request.data.get("hold_seconds", 120)))
        )
        expires_at = timezone.now() + timezone.timedelta(seconds=hold_seconds)

        with transaction.atomic():
            active_conflicts = SeatHold.objects.filter(
                screening=screening,
                seat_id__in=seat_ids,
                expires_at__gt=timezone.now(),
            ).exclude(held_by=client_id)

            if active_conflicts.exists():
                conflict_ids = list(active_conflicts.values_list("seat_id", flat=True))
                return Response(
                    {"detail": "One or more seats are currently held.", "seat_ids": conflict_ids},
                    status=status.HTTP_409_CONFLICT,
                )

            SeatHold.objects.filter(
                screening=screening,
                seat_id__in=seat_ids,
                held_by=client_id,
            ).delete()

            try:
                SeatHold.objects.bulk_create(
                    [
                        SeatHold(
                            screening=screening,
                            seat_id=seat_id,
                            held_by=client_id,
                            expires_at=expires_at,
                        )
                        for seat_id in set(seat_ids)
                    ]
                )
            except IntegrityError:
                return Response(
                    {"detail": "One or more seats are currently held."},
                    status=status.HTTP_409_CONFLICT,
                )

        broadcast_screening_update(
            screening.id,
            {"event": "hold_updated", "screening_id": screening.id},
        )
        return Response(
            {"ok": True, "expires_at": expires_at.isoformat()},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="release", permission_classes=[AllowAny])
    def release(self, request, pk=None):
        screening = self.get_object()
        client_id = request.data.get("client_id")
        seat_ids = request.data.get("seat_ids", [])

        if not client_id or not isinstance(seat_ids, list) or not seat_ids:
            return Response(
                {"detail": "client_id and seat_ids are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        SeatHold.objects.filter(
            screening=screening,
            seat_id__in=seat_ids,
            held_by=client_id,
        ).delete()

        broadcast_screening_update(
            screening.id,
            {"event": "hold_updated", "screening_id": screening.id},
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.prefetch_related("reserved_seats").order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return ReservationCreateSerializer
        return ReservationSerializer

    def get_permissions(self):
        if self.action in {"list", "destroy", "update", "partial_update"}:
            return [IsAdminUser()]
        return [AllowAny()]

    @action(detail=True, methods=["post"], url_path="start-payment", permission_classes=[AllowAny])
    def start_payment(self, request, pk=None):
        reservation = self.get_object()

        if reservation.status == Reservation.Status.CANCELLED:
            return Response(
                {"detail": "Cancelled reservations cannot be paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reservation.status == Reservation.Status.CONFIRMED:
            return Response(
                {"detail": "Reservation is already confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reservation.payment_reference:
            reservation.payment_reference = f"fakepay_{reservation.id}_{uuid.uuid4().hex[:12]}"
            reservation.save(update_fields=["payment_reference", "updated_at"])

        return Response(
            {
                "reservation_id": reservation.id,
                "status": reservation.status,
                "payment_provider": reservation.payment_provider,
                "payment_reference": reservation.payment_reference,
                "payment_amount": str(reservation.payment_amount),
                "currency": "RSD",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="confirm-payment", permission_classes=[AllowAny])
    def confirm_payment(self, request, pk=None):
        with transaction.atomic():
            reservation = (
                Reservation.objects.select_for_update()
                .select_related("screening")
                .prefetch_related("reserved_seats")
                .get(pk=pk)
            )

            if reservation.status == Reservation.Status.CANCELLED:
                return Response(
                    {"detail": "Cancelled reservations cannot be confirmed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if reservation.status == Reservation.Status.CONFIRMED:
                return Response(
                    {"detail": "Reservation is already confirmed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not reservation.payment_reference:
                reservation.payment_reference = f"fakepay_{reservation.id}_{uuid.uuid4().hex[:12]}"

            if not reservation.ticket_code:
                reservation.ticket_code = f"TICKET-{reservation.id}-{uuid.uuid4().hex[:8].upper()}"

            reservation.status = Reservation.Status.CONFIRMED
            reservation.payment_completed_at = timezone.now()
            reservation.save(
                update_fields=[
                    "status",
                    "payment_reference",
                    "payment_completed_at",
                    "ticket_code",
                    "updated_at",
                ]
            )

            SeatHold.objects.filter(
                screening=reservation.screening,
                seat_id__in=reservation.reserved_seats.values_list("seat_id", flat=True),
            ).delete()

        broadcast_screening_update(
            reservation.screening_id,
            {"event": "hold_updated", "screening_id": reservation.screening_id},
        )
        return Response(
            ReservationSerializer(reservation).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="cancel-payment", permission_classes=[AllowAny])
    def cancel_payment(self, request, pk=None):
        with transaction.atomic():
            reservation = (
                Reservation.objects.select_for_update()
                .select_related("screening")
                .prefetch_related("reserved_seats")
                .get(pk=pk)
            )

            if reservation.status == Reservation.Status.CONFIRMED:
                return Response(
                    {"detail": "Confirmed reservations cannot be cancelled through payment cancellation."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if reservation.status == Reservation.Status.CANCELLED:
                return Response(
                    {"detail": "Reservation is already cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            reserved_seat_ids = list(reservation.reserved_seats.values_list("seat_id", flat=True))

            SeatHold.objects.filter(
                screening=reservation.screening,
                seat_id__in=reserved_seat_ids,
            ).delete()

            reservation.reserved_seats.all().delete()
            reservation.status = Reservation.Status.CANCELLED
            reservation.save(update_fields=["status", "updated_at"])

        broadcast_screening_update(
            reservation.screening_id,
            {"event": "hold_updated", "screening_id": reservation.screening_id},
        )
        return Response(
            {"id": reservation.id, "status": reservation.status},
            status=status.HTTP_200_OK,
        )
    
    @action(detail=True, methods=["get"], url_path="qr", permission_classes=[AllowAny])
    def qr(self, request, pk=None):
        reservation = self.get_object()

        if reservation.status != Reservation.Status.CONFIRMED:
            return Response(
                {"detail": "QR code is available only for confirmed reservations."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reservation.ticket_code:
            reservation.ticket_code = f"TICKET-{reservation.id}-{uuid.uuid4().hex[:8].upper()}"
            reservation.save(update_fields=["ticket_code", "updated_at"])

        qr_payload = (
            f"Cinema Ticket\n"
            f"Reservation: {reservation.id}\n"
            f"Ticket: {reservation.ticket_code}\n"
            f"Customer: {reservation.customer_name}\n"
            f"Screening: {reservation.screening_id}\n"
            f"Status: {reservation.status}"
        )

        qr = qrcode.QRCode(
            version=1,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_payload)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return Response(
            {
                "reservation_id": reservation.id,
                "ticket_code": reservation.ticket_code,
                "qr_image_base64": qr_base64,
            },
            status=status.HTTP_200_OK,
        )


class ReservedSeatViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReservedSeat.objects.select_related("reservation", "screening", "seat")
    serializer_class = ReservedSeatSerializer
    permission_classes = [IsAdminUser]