from django.urls import path

from .views import (
    AcknowledgeUpdateView,
    OrderListView,
    ProjectDetailView,
    ProjectListView,
    ProjectMessageListCreateView,
    ProjectStageListView,
    ProjectUpdateListView,
)


urlpatterns = [
    path("me/orders", OrderListView.as_view(), name="my-orders"),
    path("me/projects", ProjectListView.as_view(), name="my-projects"),
    path("me/projects/<uuid:project_id>", ProjectDetailView.as_view(), name="my-project-detail"),
    path("me/projects/<uuid:project_id>/stages", ProjectStageListView.as_view(), name="my-project-stages"),
    path("me/projects/<uuid:project_id>/updates", ProjectUpdateListView.as_view(), name="my-project-updates"),
    path("me/projects/<uuid:project_id>/messages", ProjectMessageListCreateView.as_view(), name="my-project-messages"),
    path(
        "me/projects/<uuid:project_id>/updates/<uuid:update_id>/acknowledge",
        AcknowledgeUpdateView.as_view(),
        name="my-project-update-acknowledge",
    ),
]
