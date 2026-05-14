from django.db import models
from django.utils import timezone

from apps.core.models import SoftDeleteModel


class Notification(SoftDeleteModel):
    TYPE_CHOICES = [
        ("order_late", "Commande retardee"),
        ("appointment", "Rendez-vous"),
        ("payment", "Paiement"),
        ("delivery", "Livraison"),
        ("manual", "Manuelle"),
    ]

    CHANNEL_CHOICES = [
        ("web", "Web"),
        ("android_tailor", "Android tailleur"),
        ("android_client", "Android client"),
        ("whatsapp", "WhatsApp futur"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Basse"),
        ("normal", "Normale"),
        ("high", "Haute"),
        ("urgent", "Urgente"),
    ]

    STATUS_CHOICES = [
        ("unread", "Non lue"),
        ("read", "Lue"),
        ("archived", "Archivee"),
    ]

    title = models.CharField(max_length=160)
    message = models.TextField()
    notification_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default="manual")
    channel = models.CharField(max_length=32, choices=CHANNEL_CHOICES, default="web")
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default="normal")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="unread")
    target_url = models.CharField(max_length=240, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["notification_type"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title

    def mark_read(self):
        self.status = "read"
        self.read_at = timezone.now()
        self.save(update_fields=["status", "read_at", "updated_at"])

