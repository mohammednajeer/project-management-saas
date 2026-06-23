ACCESS_COOKIE_MAX_AGE = 60 * 60
REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
AUTH_COOKIE_SECURE = True
AUTH_COOKIE_SAMESITE = "None"


def set_auth_cookies(response, refresh):
    access_token = str(refresh.access_token)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
        max_age=ACCESS_COOKIE_MAX_AGE,
    )

    response.set_cookie(
        key="refresh_token",
        value=str(refresh),
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
        max_age=REFRESH_COOKIE_MAX_AGE,
    )

    return access_token
