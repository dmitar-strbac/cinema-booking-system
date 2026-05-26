import uuid
import base64
import io

import qrcode
import stripe
from django.http import JsonResponse

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
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
    RegisterSerializer,
)
from .utils import broadcast_screening_update


stripe.api_key = settings.STRIPE_SECRET_KEY


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
        if self.action == "create":
            return [IsAuthenticated()]
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
    
    @action(detail=False, methods=["get"], url_path="my", permission_classes=[IsAuthenticated])
    def my_reservations(self, request):
        reservations = (
            Reservation.objects
            .filter(user=request.user)
            .select_related("screening", "screening__movie", "screening__hall")
            .prefetch_related("reserved_seats", "reserved_seats__seat")
            .order_by("-created_at")
        )

        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(
        detail=True,
        methods=["post"],
        url_path="create-checkout-session",
        permission_classes=[AllowAny],
    )
    def create_checkout_session(self, request, pk=None):
        reservation = self.get_object()

        if reservation.status != Reservation.Status.PENDING:
            return Response(
                {"detail": "Only pending reservations can be paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": "rsd",
                        "product_data": {
                            "name": f"{reservation.screening.movie.title} Tickets",
                        },
                        "unit_amount": int(reservation.payment_amount * 100),
                    },
                    "quantity": 1,
                }
            ],
            metadata={
                "reservation_id": reservation.id,
            },
            success_url=f"{settings.FRONTEND_URL}/payments/success?reservationId={reservation.id}",
            cancel_url=f"{settings.FRONTEND_URL}/payments/cancel?reservationId={reservation.id}",
        )

        reservation.payment_provider = Reservation.PaymentProvider.STRIPE
        reservation.payment_reference = checkout_session.id
        reservation.save(update_fields=["payment_provider", "payment_reference"])

        return Response(
            {
                "checkout_url": checkout_session.url,
            }
        )


class ReservedSeatViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReservedSeat.objects.select_related("reservation", "screening", "seat")
    serializer_class = ReservedSeatSerializer
    permission_classes = [IsAdminUser]


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                },
            }
        )
    

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response(
            {
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_admin": user.is_staff,
            },
            status=status.HTTP_200_OK,
        )
    

class AdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_movies = Movie.objects.count()
        total_screenings = Screening.objects.count()
        total_reservations = Reservation.objects.count()

        confirmed_reservations = Reservation.objects.filter(
            status=Reservation.Status.CONFIRMED
        ).count()

        pending_reservations = Reservation.objects.filter(
            status=Reservation.Status.PENDING
        ).count()

        revenue = (
            Reservation.objects.filter(
                status=Reservation.Status.CONFIRMED
            ).aggregate(total=Sum("payment_amount"))["total"]
            or 0
        )

        latest_reservations = (
            Reservation.objects
            .select_related("screening", "screening__movie")
            .order_by("-created_at")[:5]
        )

        upcoming_screenings = (
            Screening.objects
            .select_related("movie", "hall")
            .filter(start_time__gte=timezone.now())
            .order_by("start_time")[:5]
        )

        return Response(
            {
                "stats": {
                    "movies": total_movies,
                    "screenings": total_screenings,
                    "reservations": total_reservations,
                    "confirmed": confirmed_reservations,
                    "pending": pending_reservations,
                    "revenue": str(revenue),
                },
                "latest_reservations": [
                    {
                        "id": r.id,
                        "customer_name": r.customer_name,
                        "movie": r.screening.movie.title,
                        "status": r.status,
                        "amount": str(r.payment_amount),
                        "created_at": r.created_at,
                    }
                    for r in latest_reservations
                ],
                "upcoming_screenings": [
                    {
                        "id": s.id,
                        "movie": s.movie.title,
                        "hall": s.hall.name,
                        "start_time": s.start_time,
                    }
                    for s in upcoming_screenings
                ],
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.body
        signature = request.META.get("HTTP_STRIPE_SIGNATURE")
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                endpoint_secret,
            )
        except ValueError:
            return Response(
                {"detail": "Invalid payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except stripe.error.SignatureVerificationError:
            return Response(
                {"detail": "Invalid signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            
            reservation_id = None
            if session.metadata:
                reservation_id = getattr(session.metadata, "reservation_id", None)

            if not reservation_id:
                return Response({"received": True}, status=status.HTTP_200_OK)

            try:
                with transaction.atomic():
                    reservation = (
                        Reservation.objects.select_for_update()
                        .select_related("screening")
                        .prefetch_related("reserved_seats")
                        .get(id=int(reservation_id))
                    )

                    if reservation.status == Reservation.Status.PENDING:
                        if not reservation.ticket_code:
                            reservation.ticket_code = (
                                f"TICKET-{reservation.id}-{uuid.uuid4().hex[:8].upper()}"
                            )

                        reservation.status = Reservation.Status.CONFIRMED
                        reservation.payment_completed_at = timezone.now()
                        reservation.payment_reference = session.id or reservation.payment_reference
                        reservation.payment_provider = Reservation.PaymentProvider.STRIPE
                        reservation.save(
                            update_fields=[
                                "status",
                                "payment_completed_at",
                                "payment_reference",
                                "payment_provider",
                                "ticket_code",
                                "updated_at",
                            ]
                        )

                        SeatHold.objects.filter(
                            screening=reservation.screening,
                            seat_id__in=reservation.reserved_seats.values_list(
                                "seat_id",
                                flat=True,
                            ),
                        ).delete()

                        broadcast_screening_update(
                            reservation.screening_id,
                            {
                                "event": "hold_updated",
                                "screening_id": reservation.screening_id,
                            },
                        )

            except Reservation.DoesNotExist:
                return Response(
                    {"detail": "Reservation not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            except Exception as e:
                return Response(
                    {"detail": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response({"received": True}, status=status.HTTP_200_OK)
    