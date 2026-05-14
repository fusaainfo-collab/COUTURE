from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import UserProfile
from apps.core.models import WorkshopMembership

from .models import TailorProfile


class TailorProfileSerializer(serializers.ModelSerializer):
    commandes_actives = serializers.SerializerMethodField()
    commandes_terminees = serializers.SerializerMethodField()
    username = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=False)
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = TailorProfile
        fields = [
            "id",
            "user",
            "user_username",
            "username",
            "password",
            "full_name",
            "phone",
            "specialty",
            "skills",
            "status",
            "quality_score",
            "average_delay_days",
            "notes",
            "commandes_actives",
            "commandes_terminees",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "created_at", "updated_at"]

    def get_commandes_actives(self, obj):
        annotated = getattr(obj, "commandes_actives", None)
        if annotated is not None:
            return annotated
        return obj.orders.exclude(status__in=["delivered", "cancelled"]).count()

    def get_commandes_terminees(self, obj):
        annotated = getattr(obj, "commandes_terminees", None)
        if annotated is not None:
            return annotated
        return obj.orders.filter(status="delivered").count()

    @transaction.atomic
    def create(self, validated_data):
        username = validated_data.pop("username", "").strip()
        password = validated_data.pop("password", "")
        tailor = super().create(validated_data)
        self._attach_user(tailor, username, password)
        return tailor

    @transaction.atomic
    def update(self, instance, validated_data):
        username = validated_data.pop("username", "").strip()
        password = validated_data.pop("password", "")
        tailor = super().update(instance, validated_data)
        self._attach_user(tailor, username, password)
        return tailor

    def _attach_user(self, tailor, username, password):
        if not username:
            return
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": tailor.full_name.split(" ")[0],
                "last_name": " ".join(tailor.full_name.split(" ")[1:]),
            },
        )
        if created:
            if password:
                user.set_password(password)
            else:
                user.set_unusable_password()
            user.save()
        elif password:
            user.set_password(password)
            user.save(update_fields=["password"])

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if created or profile.role == UserProfile.ROLE_TAILOR:
            profile.role = UserProfile.ROLE_TAILOR
            profile.phone = tailor.phone
            profile.save(update_fields=["role", "phone", "updated_at"])
        tailor.user = user
        tailor.save(update_fields=["user", "updated_at"])
        if tailor.workshop_id:
            WorkshopMembership.objects.update_or_create(
                user=user,
                workshop=tailor.workshop,
                defaults={"role": WorkshopMembership.ROLE_TAILOR, "is_active": True},
            )
