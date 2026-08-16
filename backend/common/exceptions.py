import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


logger = logging.getLogger(__name__)


def _first_error(value):
    if isinstance(value, dict):
        for item in value.values():
            message = _first_error(item)
            if message:
                return message
        return None
    if isinstance(value, (list, tuple)):
        return _first_error(value[0]) if value else None
    return str(value) if value is not None else None


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.error(
            "Unhandled API exception: %s",
            type(exc).__name__,
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        return Response(
            {
                "error": {
                    "status": 500,
                    "code": "server_error",
                    "message": "服务器暂时无法完成请求，请稍后重试。",
                    "fields": None,
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    detail = response.data.get("detail") if isinstance(response.data, dict) else None
    error_codes = exc.get_codes() if hasattr(exc, "get_codes") else None
    response.data = {
        "error": {
            "status": response.status_code,
            "code": _first_error(error_codes) or "request_error",
            "message": str(detail or _first_error(response.data) or "请求未能完成。"),
            "fields": response.data if detail is None else None,
        }
    }
    return response
