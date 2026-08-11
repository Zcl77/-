import io

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image


TEST_PASSWORD = "Local-test-password-4827"


def image_upload(name="sample.png", *, size=(32, 24), image_format="PNG", content_type="image/png"):
    output = io.BytesIO()
    Image.new("RGB", size, color=(96, 87, 70)).save(output, format=image_format)
    return SimpleUploadedFile(name, output.getvalue(), content_type=content_type)


def csrf_token(client):
    response = client.get("/api/v1/auth/csrf")
    assert response.status_code == 200
    return response.json()["csrfToken"]
