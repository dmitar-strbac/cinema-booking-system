"""
ASGI config for cinema_api project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
import bookings.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cinema_api.settings')

http_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": http_app,
        "websocket": URLRouter(bookings.routing.websocket_urlpatterns),
    }
)
