from apps.core.views import SoftDeleteModelViewSet

from .models import StatisticItem
from .serializers import StatisticItemSerializer


class StatisticItemViewSet(SoftDeleteModelViewSet):
    serializer_class = StatisticItemSerializer
    search_fields = ["label", "value", "evolution", "impact", "notes"]
    ordering_fields = ["label", "impact", "tone", "created_at", "updated_at"]
    ordering = ["label"]

    def get_queryset(self):
        return StatisticItem.objects.filter(is_deleted=False)

