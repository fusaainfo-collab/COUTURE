from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.core.views import SoftDeleteModelViewSet
from apps.core.views import get_request_workshop

from .models import Order, OrderEvent, Pattern
from .serializers import OrderEventSerializer, OrderSerializer, PatternSerializer


class PatternViewSet(SoftDeleteModelViewSet):
    serializer_class = PatternSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ["name", "category", "tags", "description"]
    ordering_fields = ["name", "category", "trend_score", "created_at"]
    ordering = ["category", "name"]

    def get_queryset(self):
        return Pattern.objects.filter(is_deleted=False)


class OrderViewSet(SoftDeleteModelViewSet):
    serializer_class = OrderSerializer
    search_fields = [
        "code",
        "client__full_name",
        "client__phone",
        "fabric",
        "color",
        "assigned_tailor__full_name",
        "pattern__name",
    ]
    ordering_fields = [
        "delivery_date",
        "deposit_date",
        "total_price",
        "priority",
        "status",
        "created_at",
    ]
    ordering = ["delivery_date", "-created_at"]

    def get_queryset(self):
        return (
            Order.objects.filter(is_deleted=False)
            .select_related("client", "measurement_profile", "pattern", "assigned_tailor")
            .prefetch_related("events", "payments")
        )


class OrderEventViewSet(SoftDeleteModelViewSet):
    serializer_class = OrderEventSerializer
    search_fields = ["order__code", "title", "description", "status", "actor"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return OrderEvent.objects.select_related("order").filter(order__workshop=get_request_workshop(self.request))
