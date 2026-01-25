from rest_framework import viewsets
from .models import (
    Movie,
    Hall,
    Seat,
    Screening,
    Reservation,
    ReservedSeat,
    SeatHold,
)
from .serializers import (
    MovieSerializer,
    HallSerializer,
    SeatSerializer,
    ScreeningSerializer,
    ReservationSerializer,
    ReservedSeatSerializer,
    ReservationCreateSerializer
)
from .utils import broadcast_screening_update
from .permissions import IsAdminOrReadOnly
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings
from django.db import transaction


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

        SeatHold.objects.filter(screening=screening, expires_at__lte=timezone.now()).delete()

        reserved_ids = set(screening.reserved_seats.values_list("seat_id", flat=True))

        active_holds = SeatHold.objects.filter(screening=screening, expires_at__gt=timezone.now())
        held_map = {h.seat_id: h.held_by for h in active_holds}

        seats = Seat.objects.filter(hall=screening.hall).order_by("row", "number")

        data = []
        for s in seats:
            held_by = held_map.get(s.id)
            data.append({
                "id": s.id,
                "row": s.row,
                "number": s.number,
                "is_reserved": s.id in reserved_ids,
                "is_held": held_by is not None,
                "held_by_me": bool(client_id and held_by == client_id),
            })

        return Response({"screening_id": screening.id, "hall_id": screening.hall_id, "seats": data})

    @action(detail=True, methods=["post"], url_path="hold", permission_classes=[AllowAny])
    def hold(self, request, pk=None):
        screening = self.get_object()
        client_id = request.data.get("client_id")
        seat_ids = request.data.get("seat_ids", [])

        if not client_id or not isinstance(seat_ids, list) or not seat_ids:
            return Response({"detail": "client_id and seat_ids are required."}, status=status.HTTP_400_BAD_REQUEST)

        SeatHold.objects.filter(screening=screening, expires_at__lte=timezone.now()).delete()

        hall_seat_ids = set(Seat.objects.filter(hall=screening.hall, id__in=seat_ids).values_list("id", flat=True))
        if len(hall_seat_ids) != len(set(seat_ids)):
            return Response({"detail": "One or more seats do not belong to the screening hall."}, status=status.HTTP_400_BAD_REQUEST)

        already_reserved = set(screening.reserved_seats.filter(seat_id__in=seat_ids).values_list("seat_id", flat=True))
        if already_reserved:
            return Response({"detail": "One or more seats are already reserved.", "seat_ids": list(already_reserved)}, status=status.HTTP_409_CONFLICT)

        hold_seconds = int(getattr(settings, "SEAT_HOLD_SECONDS", int(request.data.get("hold_seconds", 120))))
        expires_at = timezone.now() + timezone.timedelta(seconds=hold_seconds)

        with transaction.atomic():
            active_conflicts = SeatHold.objects.filter(
                screening=screening,
                seat_id__in=seat_ids,
                expires_at__gt=timezone.now(),
            ).exclude(held_by=client_id)

            if active_conflicts.exists():
                conflict_ids = list(active_conflicts.values_list("seat_id", flat=True))
                return Response({"detail": "One or more seats are currently held.", "seat_ids": conflict_ids}, status=status.HTTP_409_CONFLICT)

            SeatHold.objects.filter(screening=screening, seat_id__in=seat_ids, held_by=client_id).delete()

            try:
                SeatHold.objects.bulk_create([
                    SeatHold(screening=screening, seat_id=sid, held_by=client_id, expires_at=expires_at)
                    for sid in set(seat_ids)
                ])
            except IntegrityError:
                return Response({"detail": "One or more seats are currently held."}, status=status.HTTP_409_CONFLICT)

        broadcast_screening_update(screening.id, {"event": "hold_updated", "screening_id": screening.id})
        return Response({"ok": True, "expires_at": expires_at.isoformat()}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=["post"], url_path="release", permission_classes=[AllowAny])
    def release(self, request, pk=None):
        screening = self.get_object()
        client_id = request.data.get("client_id")
        seat_ids = request.data.get("seat_ids", [])

        if not client_id or not isinstance(seat_ids, list) or not seat_ids:
            return Response({"detail": "client_id and seat_ids are required."}, status=status.HTTP_400_BAD_REQUEST)

        SeatHold.objects.filter(screening=screening, seat_id__in=seat_ids, held_by=client_id).delete()
        broadcast_screening_update(screening.id, {"event": "hold_updated", "screening_id": screening.id})
        return Response({"ok": True}, status=status.HTTP_200_OK)


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related("screening").order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return ReservationCreateSerializer
        return ReservationSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAdminUser()]

class ReservedSeatViewSet(viewsets.ModelViewSet):
    queryset = ReservedSeat.objects.select_related("reservation", "seat")
    serializer_class = ReservedSeatSerializer
    permission_classes = [IsAdminUser]
