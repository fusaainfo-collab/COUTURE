from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    tailor_name = serializers.CharField(source="tailor.full_name", read_only=True)
    has_conflict = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "client",
            "client_name",
            "tailor",
            "tailor_name",
            "title",
            "appointment_type",
            "priority",
            "status",
            "start_at",
            "end_at",
            "notes",
            "reminder_sent",
            "has_conflict",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "has_conflict"]

    def validate(self, attrs):
        start_at = attrs.get("start_at") or getattr(self.instance, "start_at", None)
        end_at = attrs.get("end_at") or getattr(self.instance, "end_at", None)

        if end_at and start_at and end_at <= start_at:
            raise serializers.ValidationError({"end_at": "La fin doit etre apres le debut du rendez-vous."})

        return attrs

    def create(self, validated_data):
        if not validated_data.get("title"):
            appointment_type = validated_data.get("appointment_type", Appointment.TYPE_CONSULTATION)
            label = dict(Appointment.TYPE_CHOICES).get(appointment_type, "Rendez-vous")
            validated_data["title"] = f"{label} - {validated_data['client'].full_name}"
        return super().create(validated_data)

    def get_has_conflict(self, obj):
        current_end = obj.end_at or obj.start_at + timedelta(hours=1)
        current_start = obj.start_at
        if timezone.is_naive(current_start):
            current_start = timezone.make_aware(current_start, timezone.get_current_timezone())
        if timezone.is_naive(current_end):
            current_end = timezone.make_aware(current_end, timezone.get_current_timezone())

        queryset = Appointment.objects.filter(is_deleted=False).exclude(
            status__in=[Appointment.STATUS_CANCELLED, Appointment.STATUS_COMPLETED]
        )
        if obj.pk:
            queryset = queryset.exclude(pk=obj.pk)

        for other in queryset.only("start_at", "end_at"):
            other_start = other.start_at
            other_end = other.end_at or other.start_at + timedelta(hours=1)
            if timezone.is_naive(other_start):
                other_start = timezone.make_aware(other_start, timezone.get_current_timezone())
            if timezone.is_naive(other_end):
                other_end = timezone.make_aware(other_end, timezone.get_current_timezone())

            if current_start < other_end and other_start < current_end:
                return True

        return False

