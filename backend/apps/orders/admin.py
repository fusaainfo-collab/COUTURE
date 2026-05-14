from django.contrib import admin

from .models import Order, OrderEvent, Pattern


@admin.register(Pattern)
class PatternAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_favorite", "trend_score")
    list_filter = ("category", "is_favorite")
    search_fields = ("name", "category", "tags")


class OrderEventInline(admin.TabularInline):
    model = OrderEvent
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("code", "client", "status", "priority", "delivery_date", "total_price")
    list_filter = ("status", "priority", "delivery_date")
    search_fields = ("code", "client__full_name", "client__phone", "fabric", "color")
    inlines = [OrderEventInline]


@admin.register(OrderEvent)
class OrderEventAdmin(admin.ModelAdmin):
    list_display = ("order", "title", "status", "actor", "created_at")
    search_fields = ("order__code", "title", "description", "actor")

