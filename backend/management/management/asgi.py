import os

from .jwt_middleware import (
    JWTAuthMiddleware
)
from channels.routing import ProtocolTypeRouter, URLRouter

from django.core.asgi import get_asgi_application

from notifications.routing import websocket_urlpatterns


os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "management.settings"
)

django_asgi_app = get_asgi_application()


application = ProtocolTypeRouter({

    "http": django_asgi_app,

    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})