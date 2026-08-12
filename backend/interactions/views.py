from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Review
from .serializers import ApprovedReviewSerializer, InquirySubmissionSerializer, ReviewSubmissionSerializer


@method_decorator(csrf_protect, name="dispatch")
class ReviewListCreateView(ListCreateAPIView):
    permission_classes = [AllowAny]
    throttle_scope = "review-submit"
    queryset = Review.objects.filter(status=Review.Status.APPROVED).select_related("work").order_by("-created_at")

    def get_serializer_class(self):
        return ReviewSubmissionSerializer if self.request.method == "POST" else ApprovedReviewSerializer

    def get_throttles(self):
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        duplicate = getattr(serializer, "was_duplicate", False)
        return Response(
            {
                "id": str(review.pk),
                "status": review.status,
                "duplicate": duplicate,
                "message": "该评价已经提交，请勿重复操作。" if duplicate else "评价已提交，审核通过后公开。",
            },
            status=status.HTTP_200_OK if duplicate else status.HTTP_201_CREATED,
        )


@method_decorator(csrf_protect, name="dispatch")
class InquirySubmissionView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "inquiry-submit"

    def post(self, request):
        serializer = InquirySubmissionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        inquiry = serializer.save()
        duplicate = getattr(serializer, "was_duplicate", False)
        return Response(
            {
                "id": str(inquiry.pk),
                "status": inquiry.status,
                "duplicate": duplicate,
                "message": "该询价已经提交，请勿重复操作。" if duplicate else "询价已提交，工作室将根据所留方式联系您。",
            },
            status=status.HTTP_200_OK if duplicate else status.HTTP_201_CREATED,
        )
