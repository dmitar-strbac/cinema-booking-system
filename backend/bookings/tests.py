from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Hall, Movie, Reservation, ReservedSeat, Screening, Seat, SeatHold


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
                    Seat.objects.create(
                        hall=self.hall,
                        row=r,
                        number=n,
                        is_wheelchair=False,
                    )
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
        self.other_seat = Seat.objects.create(
            hall=self.hall2,
            row=1,
            number=1,
            is_wheelchair=False,
        )

        self.reservation_url = "/api/reservations/"

        User = get_user_model()
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="pass12345",
        )

        self.client.force_authenticate(user=self.user)

    def create_pending_reservation(self, seat_ids=None, client_id="client-a"):
        payload = {
            "screening": self.screening.id,
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "seat_ids": seat_ids or [self.seats[0].id, self.seats[1].id],
            "client_id": client_id,
        }
        return self.client.post(self.reservation_url, payload, format="json")

    def test_successful_reservation_creates_pending_reservation_and_reserved_seats(self):
        resp = self.create_pending_reservation()

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], Reservation.Status.PENDING)
        self.assertEqual(resp.data["payment_provider"], Reservation.PaymentProvider.FAKE)
        self.assertEqual(Decimal(resp.data["payment_amount"]), Decimal("1000.00"))

        reservation_id = resp.data["id"]
        self.assertTrue(Reservation.objects.filter(id=reservation_id).exists())

        reserved_count = ReservedSeat.objects.filter(reservation_id=reservation_id).count()
        self.assertEqual(reserved_count, 2)

    def test_double_booking_is_rejected(self):
        r1 = self.create_pending_reservation(seat_ids=[self.seats[0].id], client_id="client-a")
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)

        payload2 = {
            "screening": self.screening.id,
            "customer_name": "User 2",
            "customer_email": "u2@example.com",
            "seat_ids": [self.seats[0].id],
            "client_id": "client-b",
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
        self.assertEqual(resp.data["status"], Reservation.Status.PENDING)

    def test_start_payment_generates_reference(self):
        create_resp = self.create_pending_reservation(seat_ids=[self.seats[0].id])
        reservation_id = create_resp.data["id"]

        resp = self.client.post(f"/api/reservations/{reservation_id}/start-payment/", {}, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], Reservation.Status.PENDING)
        self.assertTrue(resp.data["payment_reference"])
        self.assertEqual(resp.data["payment_provider"], Reservation.PaymentProvider.FAKE)

    def test_confirm_payment_confirms_pending_reservation(self):
        create_resp = self.create_pending_reservation(seat_ids=[self.seats[0].id, self.seats[1].id])
        reservation_id = create_resp.data["id"]

        resp = self.client.post(f"/api/reservations/{reservation_id}/confirm-payment/", {}, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], Reservation.Status.CONFIRMED)

        reservation = Reservation.objects.get(id=reservation_id)
        self.assertEqual(reservation.status, Reservation.Status.CONFIRMED)
        self.assertIsNotNone(reservation.payment_completed_at)

    def test_cancel_payment_cancels_pending_reservation_and_releases_reserved_seats(self):
        create_resp = self.create_pending_reservation(seat_ids=[self.seats[0].id, self.seats[1].id])
        reservation_id = create_resp.data["id"]

        resp = self.client.post(f"/api/reservations/{reservation_id}/cancel-payment/", {}, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], Reservation.Status.CANCELLED)

        reservation = Reservation.objects.get(id=reservation_id)
        self.assertEqual(reservation.status, Reservation.Status.CANCELLED)
        self.assertEqual(
            ReservedSeat.objects.filter(reservation_id=reservation_id).count(),
            0,
        )

    def test_confirmed_reservation_cannot_be_cancelled_via_payment_cancel(self):
        create_resp = self.create_pending_reservation(seat_ids=[self.seats[0].id])
        reservation_id = create_resp.data["id"]

        confirm_resp = self.client.post(
            f"/api/reservations/{reservation_id}/confirm-payment/",
            {},
            format="json",
        )
        self.assertEqual(confirm_resp.status_code, status.HTTP_200_OK)

        cancel_resp = self.client.post(
            f"/api/reservations/{reservation_id}/cancel-payment/",
            {},
            format="json",
        )
        self.assertEqual(cancel_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_reservation_cannot_be_confirmed(self):
        create_resp = self.create_pending_reservation(seat_ids=[self.seats[0].id])
        reservation_id = create_resp.data["id"]

        cancel_resp = self.client.post(
            f"/api/reservations/{reservation_id}/cancel-payment/",
            {},
            format="json",
        )
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)

        confirm_resp = self.client.post(
            f"/api/reservations/{reservation_id}/confirm-payment/",
            {},
            format="json",
        )
        self.assertEqual(confirm_resp.status_code, status.HTTP_400_BAD_REQUEST)

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
        bad_seat = Seat(
            hall=self.hall,
            row=3,
            number=10,
            is_wheelchair=False,
        )
        with self.assertRaises(ValidationError):
            bad_seat.full_clean()

    def test_confirmed_reservation_returns_qr_code(self):
        create_resp = self.create_pending_reservation(seat_ids=[self.seats[0].id])
        reservation_id = create_resp.data["id"]

        confirm_resp = self.client.post(
            f"/api/reservations/{reservation_id}/confirm-payment/",
            {},
            format="json",
        )
        self.assertEqual(confirm_resp.status_code, status.HTTP_200_OK)

        qr_resp = self.client.get(f"/api/reservations/{reservation_id}/qr/")
        self.assertEqual(qr_resp.status_code, status.HTTP_200_OK)
        self.assertIn("ticket_code", qr_resp.data)
        self.assertIn("qr_image_base64", qr_resp.data)
        self.assertTrue(qr_resp.data["qr_image_base64"])

    def test_pending_reservation_cannot_access_qr_code(self):
        create_resp = self.create_pending_reservation(seat_ids=[self.seats[0].id])
        reservation_id = create_resp.data["id"]

        qr_resp = self.client.get(f"/api/reservations/{reservation_id}/qr/")
        self.assertEqual(qr_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_guest_cannot_create_reservation(self):
        self.client.force_authenticate(user=None)

        payload = {
            "screening": self.screening.id,
            "customer_name": "Guest User",
            "customer_email": "guest@example.com",
            "seat_ids": [self.seats[0].id],
            "client_id": "guest-client",
        }

        resp = self.client.post(self.reservation_url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class PermissionTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="pass12345",
            is_staff=True,
        )
        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="pass12345",
            is_staff=False,
        )

        self.movie = Movie.objects.create(
            title="Matrix",
            description="Test",
            duration_minutes=136,
            genre="SCIFI",
            release_year=1999,
            poster_url="https://example.com/matrix.jpg",
        )

    def test_public_can_read_movies(self):
        resp = self.client.get("/api/movies/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_create_movie(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "title": "New Movie",
            "description": "Test",
            "duration_minutes": 100,
            "genre": "ACTION",
            "release_year": 2025,
            "poster_url": "https://example.com/new.jpg",
        }
        resp = self.client.post("/api/movies/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_movie(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "title": "Admin Movie",
            "description": "Test",
            "duration_minutes": 110,
            "genre": "DRAMA",
            "release_year": 2024,
            "poster_url": "https://example.com/admin.jpg",
        }
        resp = self.client.post("/api/movies/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)