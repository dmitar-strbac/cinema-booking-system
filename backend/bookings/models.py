from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Movie(TimeStampedModel):
    class Genre(models.TextChoices):
        ACTION = "ACTION", "Action"
        COMEDY = "COMEDY", "Comedy"
        DRAMA = "DRAMA", "Drama"
        HORROR = "HORROR", "Horror"
        ROMANCE = "ROMANCE", "Romance"
        SCIFI = "SCIFI", "Sci-Fi"
        ANIMATION = "ANIMATION", "Animation"
        OTHER = "OTHER", "Other"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField()
    genre = models.CharField(
        max_length=20,
        choices=Genre.choices,
        default=Genre.OTHER,
    )
    release_year = models.PositiveIntegerField(blank=True, null=True)
    poster_url = models.URLField(blank=True)

    def __str__(self) -> str:
        return self.title


class Hall(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    total_rows = models.PositiveIntegerField()
    seats_per_row = models.PositiveIntegerField()

    def __str__(self) -> str:
        return self.name

    @property
    def total_seats(self) -> int:
        return self.total_rows * self.seats_per_row


class Seat(models.Model):
    hall = models.ForeignKey(Hall, related_name="seats", on_delete=models.CASCADE)
    row = models.PositiveIntegerField()
    number = models.PositiveIntegerField()
    is_wheelchair = models.BooleanField(default=False)

    class Meta:
        unique_together = ("hall", "row", "number")
        ordering = ["hall", "row", "number"]

    def __str__(self) -> str:
        return f"{self.hall.name} – row {self.row}, seat {self.number}"
    
    def clean(self):
        errors = {}
        if self.row < 1 or self.row > self.hall.total_rows:
            errors["row"] = f"Row must be between 1 and {self.hall.total_rows}."
        if self.number < 1 or self.number > self.hall.seats_per_row:
            errors["number"] = f"Seat number must be between 1 and {self.hall.seats_per_row}."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)



class Screening(TimeStampedModel):
    class Language(models.TextChoices):
        SR = "SR", "Serbian"
        EN = "EN", "English"
        DE = "DE", "German"
        OTHER = "OTHER", "Other"

    movie = models.ForeignKey(Movie, related_name="screenings", on_delete=models.CASCADE)
    hall = models.ForeignKey(Hall, related_name="screenings", on_delete=models.PROTECT)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    language = models.CharField(
        max_length=10,
        choices=Language.choices,
        default=Language.SR,
    )
    is_3d = models.BooleanField(default=False)
    base_price = models.DecimalField(max_digits=7, decimal_places=2)

    class Meta:
        ordering = ["start_time"]

    def __str__(self) -> str:
        return f"{self.movie.title} @ {self.start_time:%Y-%m-%d %H:%M}"
    
    def clean(self):
        errors = {}

        if self.end_time <= self.start_time:
            errors["end_time"] = "End time must be after start time."

        if self.hall_id and self.start_time and self.end_time and self.end_time > self.start_time:
            overlaps = Screening.objects.filter(
                hall_id=self.hall_id,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            ).exclude(pk=self.pk)

            if overlaps.exists():
                errors["start_time"] = "Screening overlaps with an existing screening in this hall."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Reservation(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"

    screening = models.ForeignKey(
        Screening,
        related_name="reservations",
        on_delete=models.CASCADE,
    )
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMED,
    )

    def __str__(self) -> str:
        return f"Reservation #{self.id} for {self.screening}"


class ReservedSeat(models.Model):
    reservation = models.ForeignKey(
        Reservation,
        related_name="reserved_seats",
        on_delete=models.CASCADE,
    )
    screening = models.ForeignKey(
        Screening,
        related_name="reserved_seats",
        on_delete=models.CASCADE,
    )
    seat = models.ForeignKey(
        Seat,
        related_name="reservations",
        on_delete=models.PROTECT,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["screening", "seat"],
                name="unique_seat_per_screening",
            )
        ]

    def __str__(self) -> str:
        return f"{self.seat} ({self.reservation})"
    

class SeatHold(TimeStampedModel):
    screening = models.ForeignKey(Screening, related_name="seat_holds", on_delete=models.CASCADE)
    seat = models.ForeignKey(Seat, related_name="holds", on_delete=models.PROTECT)
    held_by = models.CharField(max_length=64)  
    expires_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["screening", "seat"], name="unique_hold_per_seat_screening"),
        ]

    def is_active(self) -> bool:
        return self.expires_at > timezone.now()
