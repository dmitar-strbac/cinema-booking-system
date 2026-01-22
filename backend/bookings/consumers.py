import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ScreeningConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.screening_id = self.scope["url_route"]["kwargs"]["screening_id"]
        self.group_name = f"screening_{self.screening_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def seat_update(self, event):
        await self.send(text_data=json.dumps(event["payload"]))
