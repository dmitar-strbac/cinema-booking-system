from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Movie, Hall, Seat, Screening, Reservation, ReservedSeat, SeatHold
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model


class ReservationFlowTests(APITestCase):
    def setUp(self):
        self.movie = Movie.objects.create(
            title="Inception",
            description="Test",
            duration_minutes=120,
            genre="SCIFI",
            release_year=2010,
            poster_url="https://example.com/poster.jpg",
        )

        self.hall = Hall.objects.create(
            name="Main Hall",
            total_rows=2,
            seats_per_row=3,
        )

        self.seats = []
        for r in [1, 2]:
            for n in [1, 2, 3]:
                self.seats.append(
                    Seat.objects.create(hall=self.hall, row=r, number=n, is_wheelchair=False)
                )

        now = timezone.now()
        self.screening = Screening.objects.create(
            movie=self.movie,
            hall=self.hall,
            start_time=now + timedelta(days=1),
            end_time=now + timedelta(days=1, hours=2),
            language="EN",
            is_3d=False,
            base_price="500.00",
        )

        self.hall2 = Hall.objects.create(
            name="Second Hall",
            total_rows=1,
            seats_per_row=1,
        )
        self.other_seat = Seat.objects.create(hall=self.hall2, row=1, number=1, is_wheelchair=False)

        self.reservation_url = "/api/reservations/"

    def test_successful_reservation_creates_reserved_seats(self):
        payload = {
            "screening": self.screening.id,
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "seat_ids": [self.seats[0].id, self.seats[1].id],
            "client_id": "client-a",
        }

        resp = self.client.post(self.reservation_url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        reservation_id = resp.data["id"]
        self.assertTrue(Reservation.objects.filter(id=reservation_id).exists())

        reserved_count = ReservedSeat.objects.filter(reservation_id=reservation_id).count()
        self.assertEqual(reserved_count, 2)

    def test_double_booking_is_rejected(self):
        payload1 = {
            "screening": self.screening.id,
            "customer_name": "User 1",
            "customer_email": "u1@example.com",
            "seat_ids": [self.seats[0].id],
        }
        r1 = self.client.post(self.reservation_url, payload1, format="json")
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)

        payload2 = {
            "screening": self.screening.id,
            "customer_name": "User 2",
            "customer_email": "u2@example.com",
            "seat_ids": [self.seats[0].id],
        }
        r2 = self.client.post(self.reservation_url, payload2, format="json")

        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already reserved", str(r2.data).lower())

    def test_seat_from_wrong_hall_is_rejected(self):
        payload = {
            "screening": self.screening.id,
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "seat_ids": [self.other_seat.id],  
        }
        resp = self.client.post(self.reservation_url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("do not belong", str(resp.data).lower())

    def test_hold_conflict_blocks_reservation(self):
        SeatHold.objects.create(
            screening=self.screening,
            seat=self.seats[2],
            held_by="client-other",
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        payload = {
            "screening": self.screening.id,
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "seat_ids": [self.seats[2].id],
            "client_id": "client-a",
        }

        resp = self.client.post(self.reservation_url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("held", str(resp.data).lower())

    def test_expired_hold_does_not_block_reservation(self):
        SeatHold.objects.create(
            screening=self.screening,
            seat=self.seats[3],
            held_by="client-other",
            expires_at=timezone.now() - timedelta(seconds=1),
        )

        payload = {
            "screening": self.screening.id,
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "seat_ids": [self.seats[3].id],
            "client_id": "client-a",
        }

        resp = self.client.post(self.reservation_url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_screening_end_time_must_be_after_start_time(self):
        now = timezone.now()
        bad = Screening(
            movie=self.movie,
            hall=self.hall,
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2) - timedelta(minutes=1),
            language="EN",
            is_3d=False,
            base_price="500.00",
        )
        with self.assertRaises(ValidationError):
            bad.full_clean()

    def test_screenings_cannot_overlap_in_same_hall(self):
        overlap = Screening(
            movie=self.movie,
            hall=self.hall,
            start_time=self.screening.start_time + timedelta(minutes=30),
            end_time=self.screening.end_time + timedelta(minutes=30),
            language="EN",
            is_3d=False,
            base_price="500.00",
        )
        with self.assertRaises(ValidationError):
            overlap.full_clean()

    def test_seat_row_and_number_must_fit_hall_layout(self):
        bad_seat = Seat(hall=self.hall, row=99, number=1, is_wheelchair=False)
        with self.assertRaises(ValidationError):
            bad_seat.full_clean()

        bad_seat2 = Seat(hall=self.hall, row=1, number=99, is_wheelchair=False)
        with self.assertRaises(ValidationError):
            bad_seat2.full_clean()

    def test_anonymous_user_cannot_create_movie(self):
        payload = {
            "title": "Interstellar",
            "description": "Test movie",
            "duration_minutes": 169,
            "genre": "SCIFI",
            "release_year": 2014,
        }

        resp = self.client.post("/api/movies/", payload, format="json")

        self.assertIn(
            resp.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_admin_user_can_create_movie(self):
        User = get_user_model()
        admin = User.objects.create_superuser(
            username="admin",
            email="admin@test.com",
            password="password123",
        )

        self.client.force_authenticate(user=admin)

        payload = {
            "title": "Interstellar",
            "description": "Test movie",
            "duration_minutes": 169,
            "genre": "SCIFI",
            "release_year": 2014,
        }

        resp = self.client.post("/api/movies/", payload, format="json")

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Movie.objects.filter(title="Interstellar").exists())
