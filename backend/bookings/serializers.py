from rest_framework import serializers
from .models import (
    Movie,
    Hall,
    Seat,
    Screening,
    Reservation,
    ReservedSeat,
)


class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = "__all__"


class HallSerializer(serializers.ModelSerializer):
    total_seats = serializers.IntegerField(read_only=True)

    class Meta:
        model = Hall
        fields = "__all__"


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = "__all__"


class ScreeningSerializer(serializers.ModelSerializer):
    movie = MovieSerializer(read_only=True)
    movie_id = serializers.PrimaryKeyRelatedField(
        queryset=Movie.objects.all(),
        source="movie",
        write_only=True,
    )
    hall = HallSerializer(read_only=True)
    hall_id = serializers.PrimaryKeyRelatedField(
        queryset=Hall.objects.all(),
        source="hall",
        write_only=True,
    )

    class Meta:
        model = Screening
        fields = [
            "id",
            "movie",
            "movie_id",
            "hall",
            "hall_id",
            "start_time",
            "end_time",
            "language",
            "is_3d",
            "base_price",
            "created_at",
            "updated_at",
        ]


class ReservedSeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservedSeat
        fields = "__all__"


class ReservationSerializer(serializers.ModelSerializer):
    reserved_seats = ReservedSeatSerializer(many=True, read_only=True)
    seat_ids = serializers.PrimaryKeyRelatedField(
        queryset=Seat.objects.all(),
        many=True,
        write_only=True,
        source="reservedseat_set",
    )

    class Meta:
        model = Reservation
        fields = [
            "id",
            "screening",
            "customer_name",
            "customer_email",
            "status",
            "created_at",
            "updated_at",
            "reserved_seats",
            "seat_ids",
        ]
