from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        # Disable pagination explicitly if ?pagination=false query param is passed
        pagination = request.query_params.get('pagination', 'true').lower()
        if pagination == 'false':
            return None
        return super().paginate_queryset(queryset, request, view)
