import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.error(
            "Unhandled API exception: %s",
            type(exc).__name__,
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        return Response(
            {"error": {"status": 500, "message": "服务器暂时无法完成请求，请稍后重试。", "fields": None}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    detail = response.data.get("detail") if isinstance(response.data, dict) else None
    response.data = {
        "error": {
            "status": response.status_code,
            "message": str(detail or "请求未能完成。"),
            "fields": response.data if isinstance(response.data, dict) and detail is None else None,
        }
    }
    return response
