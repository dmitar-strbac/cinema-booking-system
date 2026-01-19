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
)


class MovieViewSet(viewsets.ModelViewSet):
    queryset = Movie.objects.all().order_by("title")
    serializer_class = MovieSerializer


class HallViewSet(viewsets.ModelViewSet):
    queryset = Hall.objects.all().order_by("name")
    serializer_class = HallSerializer


class SeatViewSet(viewsets.ModelViewSet):
    queryset = Seat.objects.all()
    serializer_class = SeatSerializer


class ScreeningViewSet(viewsets.ModelViewSet):
    queryset = Screening.objects.select_related("movie", "hall").order_by("start_time")
    serializer_class = ScreeningSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related("screening").order_by("-created_at")
    serializer_class = ReservationSerializer


class ReservedSeatViewSet(viewsets.ModelViewSet):
    queryset = ReservedSeat.objects.select_related("reservation", "seat")
    serializer_class = ReservedSeatSerializer
