from django.db.models import Count, Q

from apps.core.views import SoftDeleteModelViewSet

from .models import TailorProfile
from .serializers import TailorProfileSerializer


class TailorProfileViewSet(SoftDeleteModelViewSet):
    serializer_class = TailorProfileSerializer
    search_fields = ["full_name", "phone", "specialty", "skills"]
    ordering_fields = ["full_name", "quality_score", "average_delay_days", "created_at"]
    ordering = ["full_name"]

    def get_queryset(self):
        return (
            TailorProfile.objects.filter(is_deleted=False)
            .annotate(
                commandes_actives=Count(
                    "orders",
                    filter=~Q(orders__status__in=["delivered", "cancelled"]),
                ),
                commandes_terminees=Count("orders", filter=Q(orders__status="delivered")),
            )
            .order_by("full_name")
        )

