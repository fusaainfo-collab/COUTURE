from django.db import models
from django.utils import timezone

from apps.core.models import SoftDeleteModel


class Payment(SoftDeleteModel):
    METHOD_CHOICES = [
        ("cash", "Especes"),
        ("mobile_money", "Mobile money"),
        ("card", "Carte"),
        ("transfer", "Virement"),
        ("other", "Autre"),
    ]

    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("paid", "Paye"),
        ("cancelled", "Annule"),
        ("refunded", "Rembourse"),
    ]

    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="payments")
    order = models.ForeignKey(
        "orders.Order",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=24, choices=METHOD_CHOICES, default="cash")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="paid")
    reference = models.CharField(max_length=120, blank=True)
    paid_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-paid_at", "-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["paid_at"]),
            models.Index(fields=["method"]),
        ]

    def __str__(self):
        return f"{self.client.full_name} - {self.amount}"


class Expense(SoftDeleteModel):
    CATEGORY_CHOICES = [
        ("fabric", "Tissu"),
        ("salary", "Salaire"),
        ("rent", "Loyer"),
        ("equipment", "Materiel"),
        ("transport", "Transport"),
        ("other", "Autre"),
    ]

    label = models.CharField(max_length=160)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default="other")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    spent_at = models.DateField(default=timezone.localdate)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-spent_at", "-created_at"]

    def __str__(self):
        return f"{self.label} - {self.amount}"

