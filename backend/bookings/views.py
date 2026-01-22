from rest_framework import viewsets
from .models import (
    Movie,
    Hall,
    Seat,
    Screening,
    Reservation,
    ReservedSeat,
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
from .permissions import IsAdminOrReadOnly
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.decorators import action


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

        reserved_ids = set(
            screening.reserved_seats.values_list("seat_id", flat=True)
        )

        seats = Seat.objects.filter(hall=screening.hall).order_by("row", "number")
        data = [
            {"id": s.id, "row": s.row, "number": s.number, "is_reserved": s.id in reserved_ids}
            for s in seats
        ]
        return Response({"screening_id": screening.id, "hall_id": screening.hall_id, "seats": data})


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
