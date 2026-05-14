from rest_framework import serializers

from .models import MeasurementProfile, MeasurementRevision


class MeasurementRevisionSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.username", read_only=True)

    class Meta:
        model = MeasurementRevision
        fields = [
            "id",
            "changed_by_name",
            "previous_measurements",
            "new_measurements",
            "note",
            "created_at",
        ]


class MeasurementProfileSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    revisions = MeasurementRevisionSerializer(many=True, read_only=True)

    class Meta:
        model = MeasurementProfile
        fields = [
            "id",
            "client",
            "client_name",
            "label",
            "category",
            "unit",
            "measurements",
            "reference_photos",
            "notes",
            "is_default",
            "revisions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "revisions"]

    def update(self, instance, validated_data):
        previous = instance.measurements
        updated = super().update(instance, validated_data)
        if "measurements" in validated_data and previous != updated.measurements:
            request = self.context.get("request")
            MeasurementRevision.objects.create(
                profile=updated,
                changed_by=getattr(request, "user", None) if request else None,
                previous_measurements=previous,
                new_measurements=updated.measurements,
                note="Mise a jour depuis l'API",
            )
        return updated

