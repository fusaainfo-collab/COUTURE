from django.db.models import Count, Q

from apps.core.views import SoftDeleteModelViewSet

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(SoftDeleteModelViewSet):
    serializer_class = ClientSerializer
    search_fields = ["full_name", "phone", "whatsapp", "email", "address"]
    ordering_fields = ["full_name", "vip_level", "created_at", "updated_at"]
    ordering = ["full_name"]

    def get_queryset(self):
        return (
            Client.objects.filter(is_deleted=False)
            .annotate(
                commandes_actives=Count(
                    "orders",
                    filter=~Q(orders__status__in=["delivered", "cancelled"]),
                )
            )
            .order_by("full_name")
        )

