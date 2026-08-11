from rest_framework.permissions import BasePermission

from accounts.models import User


class HasCompletedPasswordChange(BasePermission):
    message = "首次登录后必须先修改临时密码。"

    def has_permission(self, request, view):
        user = request.user
        return bool(user.is_authenticated and not user.must_change_password)


class IsCustomerOrStaff(BasePermission):
    message = "当前账号无权访问客户项目。"

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated or not user.is_active:
            return False
        if user.is_staff:
            return True
        if user.role != User.Role.CUSTOMER:
            return False
        profile = getattr(user, "customer_profile", None)
        return bool(profile and profile.is_active)
