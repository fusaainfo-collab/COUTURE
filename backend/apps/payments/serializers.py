from rest_framework import serializers

from .models import Expense, Payment


class PaymentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    order_code = serializers.CharField(source="order.code", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "client",
            "client_name",
            "order",
            "order_code",
            "amount",
            "method",
            "status",
            "reference",
            "paid_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id",
            "label",
            "category",
            "amount",
            "spent_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

