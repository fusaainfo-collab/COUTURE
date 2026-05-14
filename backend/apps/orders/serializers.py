from rest_framework import serializers

from .models import Order, OrderEvent, Pattern


class PatternSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pattern
        fields = [
            "id",
            "name",
            "category",
            "image",
            "tags",
            "description",
            "is_favorite",
            "trend_score",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class OrderEventSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.code", read_only=True)

    class Meta:
        model = OrderEvent
        fields = [
            "id",
            "order",
            "order_code",
            "title",
            "description",
            "status",
            "actor",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class OrderSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    tailor_name = serializers.CharField(source="assigned_tailor.full_name", read_only=True)
    pattern_name = serializers.CharField(source="pattern.name", read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    events = OrderEventSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "code",
            "client",
            "client_name",
            "measurement_profile",
            "pattern",
            "pattern_name",
            "fabric",
            "color",
            "total_price",
            "advance_paid",
            "amount_paid",
            "balance_due",
            "deposit_date",
            "delivery_date",
            "assigned_tailor",
            "tailor_name",
            "priority",
            "status",
            "progress",
            "is_overdue",
            "notes",
            "events",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["code", "created_at", "updated_at", "events"]

    def create(self, validated_data):
        order = super().create(validated_data)
        request = self.context.get("request")
        OrderEvent.objects.create(
            order=order,
            title="Commande creee",
            status=order.status,
            actor=getattr(getattr(request, "user", None), "username", ""),
        )
        return order

    def update(self, instance, validated_data):
        old_status = instance.status
        order = super().update(instance, validated_data)
        if old_status != order.status:
            request = self.context.get("request")
            OrderEvent.objects.create(
                order=order,
                title="Statut mis a jour",
                description=f"{old_status} -> {order.status}",
                status=order.status,
                actor=getattr(getattr(request, "user", None), "username", ""),
            )
        return order
