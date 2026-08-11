from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data.get("detail") if isinstance(response.data, dict) else None
    response.data = {
        "error": {
            "status": response.status_code,
            "message": str(detail or "请求未能完成。"),
            "fields": response.data if isinstance(response.data, dict) and detail is None else None,
        }
    }
    return response
