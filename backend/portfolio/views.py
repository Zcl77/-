from django.db.models import Prefetch, Q
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from media_library.models import MediaAsset

from .models import Category, PublicProcessImage, PublicProcessPost, StudioSetting, Work, WorkImage
from .serializers import (
    CategorySerializer,
    PublicProcessPostSerializer,
    StudioSettingSerializer,
    WorkDetailSerializer,
    WorkListSerializer,
)


def public_work_images_prefetch():
    return Prefetch(
        "images",
        queryset=WorkImage.objects.filter(media__access=MediaAsset.Access.PUBLIC).select_related("media"),
        to_attr="public_images",
    )


def public_process_images_prefetch():
    return Prefetch(
        "images",
        queryset=PublicProcessImage.objects.filter(media__access=MediaAsset.Access.PUBLIC).select_related("media"),
        to_attr="public_images",
    )


class SiteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        setting = StudioSetting.objects.order_by("created_at").first()
        if setting is None:
            return Response(
                {
                    "studio_name": "知行造境",
                    "studio_name_en": "Zhixing Studio",
                    "tagline": "",
                    "description": "",
                    "contact_name": "",
                    "phone": "",
                    "wechat": "",
                    "email": "",
                    "privacy_notice": "",
                }
            )
        return Response(StudioSettingSerializer(setting).data)


class CategoryListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None
    queryset = Category.objects.filter(is_visible=True).order_by("sort_order", "name")


class WorkListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = WorkListSerializer

    def get_queryset(self):
        queryset = (
            Work.objects.filter(status=Work.Status.PUBLISHED, category__is_visible=True)
            .select_related("category")
            .prefetch_related(public_work_images_prefetch())
            .order_by("sort_order", "-published_at", "title")
        )
        category = self.request.query_params.get("category")
        return queryset.filter(category__slug=category) if category else queryset


class WorkDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = WorkDetailSerializer
    lookup_field = "slug"
    queryset = (
        Work.objects.filter(status=Work.Status.PUBLISHED, category__is_visible=True)
        .select_related("category")
        .prefetch_related(public_work_images_prefetch())
    )


class PublicProcessListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicProcessPostSerializer
    queryset = (
        PublicProcessPost.objects.filter(status=PublicProcessPost.Status.PUBLISHED)
        .filter(
            Q(work__isnull=True)
            | Q(work__status=Work.Status.PUBLISHED, work__category__is_visible=True)
        )
        .select_related("work")
        .prefetch_related(public_process_images_prefetch())
        .order_by("-published_at", "-created_at")
    )
