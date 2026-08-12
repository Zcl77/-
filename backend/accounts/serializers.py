from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from common.serializers import StrictSerializer


class LoginSerializer(StrictSerializer):
    username = serializers.CharField(
        max_length=18,
        trim_whitespace=True,
        error_messages={"max_length": "用户名最多 18 个字符。"},
    )
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["username"],
            password=attrs["password"],
        )
        if user is None or not user.is_active:
            raise AuthenticationFailed("用户名或密码错误。")
        attrs["user"] = user
        return attrs


class PasswordChangeSerializer(StrictSerializer):
    current_password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)
    new_password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("当前密码不正确。")
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        try:
            validate_password(value, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


def serialize_user(user):
    profile = getattr(user, "customer_profile", None)
    return {
        "authenticated": True,
        "id": str(user.pk),
        "username": user.get_username(),
        "displayName": profile.display_name if profile else user.get_full_name() or user.get_username(),
        "role": user.role,
        "isStaff": user.is_staff,
        "mustChangePassword": user.must_change_password,
        "isDevData": user.is_dev_data,
    }
