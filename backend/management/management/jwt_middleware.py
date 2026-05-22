from channels.middleware import (
    BaseMiddleware
)

from channels.db import (
    database_sync_to_async
)


@database_sync_to_async
def get_user(user_id):

    from django.contrib.auth import (
        get_user_model
    )

    User = get_user_model()

    try:

        return User.objects.get(
            id=user_id
        )

    except User.DoesNotExist:

        return None


class JWTAuthMiddleware(
    BaseMiddleware
):

    async def __call__(
        self,
        scope,
        receive,
        send
    ):

        headers = dict(
            scope["headers"]
        )

        cookies = {}

        if b"cookie" in headers:

            cookie_header = (
                headers[b"cookie"]
                .decode()
            )

            for cookie in cookie_header.split(";"):

                key, value = (
                    cookie.strip()
                    .split("=", 1)
                )

                cookies[key] = value

        token = cookies.get(
            "access_token"
        )
        print("JWT TOKEN is here:", token)
        scope["user"] = None

        if token:

            try:

                from rest_framework_simplejwt.tokens import (
                    AccessToken
                )

                access_token = (
                    AccessToken(token)
                )

                user = await get_user(
                    access_token["user_id"]
                )

                scope["user"] = user

            except Exception as e:

                print(
                    "JWT WEBSOCKET ERROR:",
                    e
                )

        return await super().__call__(
            scope,
            receive,
            send
        )