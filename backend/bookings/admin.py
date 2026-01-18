from django.contrib import admin
from .models import Movie, Hall, Seat, Screening, Reservation, ReservedSeat


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ("title", "genre", "duration_minutes", "release_year")
    search_fields = ("title",)


@admin.register(Hall)
class HallAdmin(admin.ModelAdmin):
    list_display = ("name", "total_rows", "seats_per_row", "total_seats")


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ("hall", "row", "number", "is_wheelchair")
    list_filter = ("hall", "is_wheelchair")


@admin.register(Screening)
class ScreeningAdmin(admin.ModelAdmin):
    list_display = ("movie", "hall", "start_time", "language", "is_3d", "base_price")
    list_filter = ("hall", "movie", "language", "is_3d")


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "screening", "customer_name", "customer_email", "status", "created_at")
    list_filter = ("status", "screening__movie")


@admin.register(ReservedSeat)
class ReservedSeatAdmin(admin.ModelAdmin):
    list_display = ("reservation", "seat")
    list_filter = ("seat__hall",)
