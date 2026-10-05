import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class StockConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = 'stock_updates'

    async def connect(self):
        await self.channel_layer.group_add(
            self.GROUP_NAME,
            self.channel_name
        )
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to ApexStock real-time WebSocket stream'
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.GROUP_NAME,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')
            if action == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except Exception:
            pass

    async def stock_event(self, event):
        # Forward event data directly to WebSocket client
        await self.send(text_data=json.dumps(event['payload']))


def broadcast_realtime_event(event_type: str, data: dict):
    """Sync helper to broadcast events across the WebSocket group from views or celery tasks."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                StockConsumer.GROUP_NAME,
                {
                    'type': 'stock_event',
                    'payload': {
                        'event': event_type,
                        'data': data
                    }
                }
            )
    except Exception as e:
        # Failsafe if redis/channel layer is not running
        pass
