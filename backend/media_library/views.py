from pathlib import PurePosixPath
from urllib.parse import quote

from django.conf import settings
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from common.permissions import HasCompletedPasswordChange, IsCustomerOrStaff
from portfolio.models import PublicProcessPost, Work
from projects.models import ProgressUpdate

from .models import MediaAsset


VARIANT_FIELDS = {
    "original": "original",
    "display": "display",
    "thumbnail": "thumbnail",
}


def _serve_asset(asset, variant, *, private):
    field_name = VARIANT_FIELDS.get(variant)
    if field_name is None:
        from rest_framework.exceptions import NotFound

        raise NotFound("图片版本不存在。")
    file_field = getattr(asset, field_name)
    if not file_field or not file_field.name:
        from rest_framework.exceptions import NotFound

        raise NotFound("图片文件不存在。")

    content_type = asset.detected_content_type if variant == "original" else "image/webp"
    if private and settings.USE_X_ACCEL_REDIRECT:
        response = HttpResponse(content_type=content_type)
        response["X-Accel-Redirect"] = f"{settings.X_ACCEL_PRIVATE_PREFIX.rstrip('/')}/{quote(file_field.name)}"
    else:
        try:
            response = FileResponse(file_field.open("rb"), content_type=content_type)
        except FileNotFoundError as exc:
            from rest_framework.exceptions import NotFound

            raise NotFound("图片文件不存在。") from exc

    suffix = PurePosixPath(file_field.name).suffix
    filename = f"{PurePosixPath(asset.original_name).stem or 'image'}{suffix}"
    response["Content-Disposition"] = f"inline; filename*=UTF-8''{quote(filename)}"
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store" if private else "public, max-age=3600"
    return response


class PublicMediaView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, asset_id):
        visible_work_reference = Q(
            work_images__work__status=Work.Status.PUBLISHED,
            work_images__work__category__is_visible=True,
        )
        visible_process_reference = Q(
            public_process_images__post__status=PublicProcessPost.Status.PUBLISHED,
            public_process_images__post__work__isnull=True,
        ) | Q(
            public_process_images__post__status=PublicProcessPost.Status.PUBLISHED,
            public_process_images__post__work__status=Work.Status.PUBLISHED,
            public_process_images__post__work__category__is_visible=True,
        )
        asset = get_object_or_404(
            MediaAsset.objects.filter(access=MediaAsset.Access.PUBLIC)
            .filter(visible_work_reference | visible_process_reference)
            .distinct(),
            pk=asset_id,
        )
        return _serve_asset(asset, request.query_params.get("variant", "display"), private=False)


@method_decorator(never_cache, name="dispatch")
class PrivateMediaView(APIView):
    permission_classes = [IsAuthenticated, HasCompletedPasswordChange, IsCustomerOrStaff]

    def get(self, request, asset_id):
        queryset = MediaAsset.objects.filter(access=MediaAsset.Access.PRIVATE)
        if request.user.is_staff:
            if not request.user.has_perm("media_library.view_mediaasset"):
                queryset = queryset.none()
        else:
            queryset = queryset.filter(
                progress_images__update__status=ProgressUpdate.Status.PUBLISHED,
                progress_images__update__project__memberships__user=request.user,
                progress_images__update__project__memberships__is_active=True,
            ).distinct()
        asset = get_object_or_404(queryset, pk=asset_id)
        return _serve_asset(asset, request.query_params.get("variant", "display"), private=True)
