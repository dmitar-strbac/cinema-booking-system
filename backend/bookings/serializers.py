from decimal import Decimal
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import (
    Hall,
    Movie,
    Reservation,
    ReservedSeat,
    Screening,
    Seat,
    SeatHold,
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
    row = serializers.IntegerField(source="seat.row", read_only=True)
    number = serializers.IntegerField(source="seat.number", read_only=True)

    class Meta:
        model = ReservedSeat
        fields = "__all__"


class ReservationSerializer(serializers.ModelSerializer):
    reserved_seats = ReservedSeatSerializer(many=True, read_only=True)
    screening_detail = ScreeningSerializer(source="screening", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "screening",
            "screening_detail",
            "user",
            "customer_name",
            "customer_email",
            "status",
            "payment_provider",
            "payment_reference",
            "payment_amount",
            "payment_completed_at",
            "ticket_code",
            "created_at",
            "updated_at",
            "reserved_seats",
        ]


class ReservationCreateSerializer(serializers.ModelSerializer):
    seat_ids = serializers.PrimaryKeyRelatedField(
        queryset=Seat.objects.all(),
        many=True,
        write_only=True,
    )
    client_id = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = Reservation
        fields = [
            "id",
            "screening",
            "customer_name",
            "customer_email",
            "seat_ids",
            "client_id",
            "status",
            "payment_provider",
            "payment_reference",
            "payment_amount",
            "payment_completed_at",
            "ticket_code",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "payment_provider",
            "payment_reference",
            "payment_amount",
            "payment_completed_at",
            "ticket_code",
            "created_at",
        ]

    def validate(self, attrs):
        screening = attrs["screening"]
        seats = attrs["seat_ids"]

        hall_seat_ids = set(
            Seat.objects.filter(hall=screening.hall).values_list("id", flat=True)
        )
        for seat in seats:
            if seat.id not in hall_seat_ids:
                raise serializers.ValidationError(
                    "One or more seats do not belong to the screening hall."
                )

        return attrs

    def create(self, validated_data):
        seats = validated_data.pop("seat_ids")
        screening = validated_data["screening"]
        client_id = (validated_data.pop("client_id", "") or "").strip()

        with transaction.atomic():
            SeatHold.objects.filter(
                screening=screening,
                expires_at__lte=timezone.now(),
            ).delete()

            if client_id:
                active_holds = SeatHold.objects.filter(
                    screening=screening,
                    seat__in=seats,
                    expires_at__gt=timezone.now(),
                )
                conflicts = active_holds.exclude(held_by=client_id)
                if conflicts.exists():
                    conflict_ids = list(conflicts.values_list("seat_id", flat=True))
                    raise serializers.ValidationError(
                        {
                            "seat_ids": conflict_ids,
                            "detail": "One or more seats are held by another user.",
                        }
                    )

            amount = screening.base_price * Decimal(len(seats))

            request = self.context.get("request")

            reservation = Reservation.objects.create(
                **validated_data,
                user=request.user if request and request.user.is_authenticated else None,
                status=Reservation.Status.PENDING,
                payment_provider=Reservation.PaymentProvider.FAKE,
                payment_amount=amount,
            )

            try:
                ReservedSeat.objects.bulk_create(
                    [
                        ReservedSeat(
                            reservation=reservation,
                            screening=screening,
                            seat=seat,
                        )
                        for seat in seats
                    ]
                )
            except IntegrityError:
                raise serializers.ValidationError(
                    "One or more selected seats are already reserved."
                )

            if client_id:
                SeatHold.objects.filter(
                    screening=screening,
                    seat__in=seats,
                    held_by=client_id,
                ).delete()

        return reservation
    

class RegisterSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=True, allow_blank=False, max_length=150)
    last_name = serializers.CharField(required=True, allow_blank=False, max_length=150)
    username = serializers.CharField(required=True, allow_blank=False, max_length=150)
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True, required=True, allow_blank=False, min_length=8)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "username", "email", "password"]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password=validated_data["password"],
        )