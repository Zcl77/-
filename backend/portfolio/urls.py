from django.urls import path

from .views import CategoryListView, PublicProcessListView, SiteView, WorkDetailView, WorkListView


urlpatterns = [
    path("site", SiteView.as_view(), name="site"),
    path("categories", CategoryListView.as_view(), name="categories"),
    path("works", WorkListView.as_view(), name="works"),
    path("works/<slug:slug>", WorkDetailView.as_view(), name="work-detail"),
    path("public-process", PublicProcessListView.as_view(), name="public-process"),
]
