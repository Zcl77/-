from rest_framework import serializers


class RejectUnknownFieldsMixin:
    """Reject undeclared input keys instead of silently discarding them."""

    def to_internal_value(self, data):
        if hasattr(data, "keys"):
            unknown = set(data.keys()) - set(self.fields.keys())
            if unknown:
                raise serializers.ValidationError(
                    {field: ["不允许提交此字段。"] for field in sorted(unknown)}
                )
        return super().to_internal_value(data)


class StrictSerializer(RejectUnknownFieldsMixin, serializers.Serializer):
    pass


class StrictModelSerializer(RejectUnknownFieldsMixin, serializers.ModelSerializer):
    pass
