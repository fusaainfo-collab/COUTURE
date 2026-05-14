from django.utils.dateparse import parse_datetime
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.views import SoftDeleteModelViewSet

from .models import Expense, Payment
from .serializers import ExpenseSerializer, PaymentSerializer


class PaymentViewSet(SoftDeleteModelViewSet):
    serializer_class = PaymentSerializer
    search_fields = ["client__full_name", "client__phone", "order__code", "reference", "notes"]
    ordering_fields = ["paid_at", "amount", "status", "method", "created_at"]
    ordering = ["-paid_at"]

    def get_queryset(self):
        return Payment.objects.filter(is_deleted=False).select_related("client", "order")

    @action(detail=False, methods=["get"], url_path="transactions")
    def transactions(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        start = parse_datetime(request.query_params.get("start", "")) if request.query_params.get("start") else None
        end = parse_datetime(request.query_params.get("end", "")) if request.query_params.get("end") else None

        if start:
            queryset = queryset.filter(paid_at__gte=start)
        if end:
            queryset = queryset.filter(paid_at__lte=end)

        queryset = queryset.order_by("paid_at", "created_at")
        serializer = self.get_serializer(queryset, many=True)
        total_paid = sum(payment.amount for payment in queryset if payment.status == "paid")
        total_pending = sum(payment.amount for payment in queryset if payment.status == "pending")

        return Response(
            {
                "count": queryset.count(),
                "total_paid": total_paid,
                "total_pending": total_pending,
                "results": serializer.data,
            }
        )


class ExpenseViewSet(SoftDeleteModelViewSet):
    serializer_class = ExpenseSerializer
    search_fields = ["label", "category", "notes"]
    ordering_fields = ["spent_at", "amount", "category", "created_at"]
    ordering = ["-spent_at"]

    def get_queryset(self):
        return Expense.objects.filter(is_deleted=False)
