from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import UserProfile
from apps.core.models import WorkshopMembership

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    commandes_actives = serializers.IntegerField(read_only=True)
    username = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=False)
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id",
            "user",
            "user_username",
            "username",
            "password",
            "full_name",
            "phone",
            "whatsapp",
            "email",
            "address",
            "gender",
            "preferences",
            "favorite_sizes",
            "private_notes",
            "photo",
            "vip_level",
            "is_active",
            "commandes_actives",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "created_at", "updated_at"]

    @transaction.atomic
    def create(self, validated_data):
        username = validated_data.pop("username", "").strip()
        password = validated_data.pop("password", "")
        client = super().create(validated_data)
        self._attach_user(client, username, password)
        return client

    @transaction.atomic
    def update(self, instance, validated_data):
        username = validated_data.pop("username", "").strip()
        password = validated_data.pop("password", "")
        client = super().update(instance, validated_data)
        self._attach_user(client, username, password)
        return client

    def _attach_user(self, client, username, password):
        if not username:
            return
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": client.full_name.split(" ")[0],
                "last_name": " ".join(client.full_name.split(" ")[1:]),
                "email": client.email,
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
        if created or profile.role == UserProfile.ROLE_CLIENT:
            profile.role = UserProfile.ROLE_CLIENT
            profile.phone = client.phone
            profile.save(update_fields=["role", "phone", "updated_at"])
        client.user = user
        client.save(update_fields=["user", "updated_at"])
        if client.workshop_id:
            WorkshopMembership.objects.update_or_create(
                user=user,
                workshop=client.workshop,
                defaults={"role": WorkshopMembership.ROLE_CLIENT, "is_active": True},
            )
