from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MovieViewSet,
    HallViewSet,
    SeatViewSet,
    ScreeningViewSet,
    ReservationViewSet,
    ReservedSeatViewSet,
    RegisterView,
    MeView
)


router = DefaultRouter()
router.register(r"movies", MovieViewSet, basename="movie")
router.register(r"halls", HallViewSet, basename="hall")
router.register(r"seats", SeatViewSet, basename="seat")
router.register(r"screenings", ScreeningViewSet, basename="screening")
router.register(r"reservations", ReservationViewSet, basename="reservation")
router.register(r"reserved-seats", ReservedSeatViewSet, basename="reservedseat")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/register/", RegisterView.as_view(), name="register"),
]
