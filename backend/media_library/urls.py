from django.urls import path

from .views import PrivateMediaView, PublicMediaView


urlpatterns = [
    path("media/public/<uuid:asset_id>", PublicMediaView.as_view(), name="public-media"),
    path("me/media/<uuid:asset_id>", PrivateMediaView.as_view(), name="private-media"),
]
