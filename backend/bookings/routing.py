from django.urls import re_path
from .consumers import ScreeningConsumer

websocket_urlpatterns = [
    re_path(r"^ws/screenings/(?P<screening_id>\d+)/$", ScreeningConsumer.as_asgi()),
]
