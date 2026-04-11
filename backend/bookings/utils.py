from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_screening_update(screening_id: int, payload: dict):
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        async_to_sync(channel_layer.group_send)(
            f"screening_{screening_id}",
            {"type": "seat_update", "payload": payload},
        )
    except Exception:
        # In local dev or tests, Redis / channel layer may be unavailable.
        # We don't want seat hold/payment actions to fail just because broadcasting failed.
        pass