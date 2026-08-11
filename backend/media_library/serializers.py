from django.urls import reverse


def serialize_media(asset, request, *, private=False):
    route = "private-media" if private else "public-media"
    base_url = request.build_absolute_uri(reverse(route, kwargs={"asset_id": asset.pk}))
    return {
        "id": str(asset.pk),
        "originalUrl": f"{base_url}?variant=original",
        "displayUrl": f"{base_url}?variant=display",
        "thumbnailUrl": f"{base_url}?variant=thumbnail",
        "width": asset.width,
        "height": asset.height,
    }
