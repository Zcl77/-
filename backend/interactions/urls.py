from django.urls import path

from .views import InquirySubmissionView, ReviewListCreateView


urlpatterns = [
    path("reviews", ReviewListCreateView.as_view(), name="reviews"),
    path("inquiries", InquirySubmissionView.as_view(), name="inquiry-submit"),
]
