from rest_framework import serializers

from .models import StatisticItem


class StatisticItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatisticItem
        fields = [
            "id",
            "label",
            "value",
            "evolution",
            "impact",
            "tone",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

