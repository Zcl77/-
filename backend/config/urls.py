from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("common.urls")),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/", include("portfolio.urls")),
    path("api/v1/", include("interactions.urls")),
    path("api/v1/", include("projects.urls")),
    path("api/v1/", include("media_library.urls")),
]

admin.site.site_header = "知行造境管理后台"
admin.site.site_title = "知行造境"
admin.site.index_title = "内容与客户项目管理"
