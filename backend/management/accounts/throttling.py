from rest_framework.throttling import SimpleRateThrottle

class AuthRateThrottle(SimpleRateThrottle):
    scope = 'auth'

    def get_cache_key(self, request, view):
        # Throttles authentication operations based on client IP address
        return self.get_ident(request)
