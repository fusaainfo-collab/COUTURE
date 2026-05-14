from django.contrib import admin

from .models import Expense, Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("client", "order", "amount", "method", "status", "paid_at")
    list_filter = ("status", "method", "paid_at")
    search_fields = ("client__full_name", "client__phone", "order__code", "reference")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("label", "category", "amount", "spent_at")
    list_filter = ("category", "spent_at")
    search_fields = ("label", "notes")

