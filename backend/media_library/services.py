import hashlib
import io
import warnings
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError


MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MAX_IMAGE_DIMENSION = 12_000
DISPLAY_MAX_SIZE = (2400, 2400)
THUMBNAIL_MAX_SIZE = (640, 640)

ALLOWED_FORMATS = {
    "JPEG": {"mime": "image/jpeg", "extensions": {".jpg", ".jpeg"}, "extension": ".jpg"},
    "PNG": {"mime": "image/png", "extensions": {".png"}, "extension": ".png"},
    "WEBP": {"mime": "image/webp", "extensions": {".webp"}, "extension": ".webp"},
}


def delete_asset_files_now(asset):
    storage = asset.original.storage
    names = {
        field.name
        for field in (asset.original, asset.display, asset.thumbnail)
        if field and field.name
    }
    for name in names:
        storage.delete(name)


def _read_upload(uploaded_file):
    uploaded_file.seek(0)
    data = uploaded_file.read(MAX_IMAGE_BYTES + 1)
    uploaded_file.seek(0)
    if not data:
        raise ValidationError("图片文件为空。")
    if len(data) > MAX_IMAGE_BYTES:
        raise ValidationError("单张图片不能超过 15 MB。")
    return data


def _decode_image(data):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as probe:
                image_format = probe.format
                frame_count = getattr(probe, "n_frames", 1)
                width, height = probe.size
                probe.verify()
            if width * height > MAX_IMAGE_PIXELS or width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                raise ValidationError("图片像素尺寸超过安全上限。")
            image = Image.open(io.BytesIO(data))
            image.load()
    except (Image.DecompressionBombError, Image.DecompressionBombWarning, UnidentifiedImageError, OSError) as exc:
        raise ValidationError("文件不是可安全解码的 JPEG、PNG 或 WebP 图片。") from exc

    if image_format not in ALLOWED_FORMATS or frame_count != 1:
        image.close()
        raise ValidationError("第一版只接受单帧 JPEG、PNG 和 WebP 图片。")

    return image, image_format


def _encode_derivative(image, max_size):
    prepared = ImageOps.exif_transpose(image).copy()
    prepared.thumbnail(max_size, Image.Resampling.LANCZOS)
    if prepared.mode not in {"RGB", "RGBA"}:
        prepared = prepared.convert("RGBA" if "transparency" in prepared.info else "RGB")
    output = io.BytesIO()
    prepared.save(output, format="WEBP", quality=88, method=6)
    prepared.close()
    return output.getvalue()


def prepare_image_asset(asset):
    uploaded_file = asset.original.file
    original_name = Path(getattr(uploaded_file, "name", asset.original.name)).name
    declared_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    extension = Path(original_name).suffix.lower()
    data = _read_upload(uploaded_file)
    image, image_format = _decode_image(data)
    rules = ALLOWED_FORMATS[image_format]

    if extension not in rules["extensions"]:
        image.close()
        raise ValidationError("文件扩展名与实际图片格式不一致。")
    if declared_type and declared_type != rules["mime"]:
        image.close()
        raise ValidationError("声明的 MIME 类型与实际图片内容不一致。")

    width, height = image.size
    display_data = _encode_derivative(image, DISPLAY_MAX_SIZE)
    thumbnail_data = _encode_derivative(image, THUMBNAIL_MAX_SIZE)
    image.close()

    asset.original_name = original_name[:255]
    asset.declared_content_type = declared_type or rules["mime"]
    asset.detected_content_type = rules["mime"]
    asset.size_bytes = len(data)
    asset.width = width
    asset.height = height
    asset.sha256 = hashlib.sha256(data).hexdigest()

    saved_names = []
    storage = asset.original.storage
    try:
        asset.original.save(f"original{rules['extension']}", ContentFile(data), save=False)
        saved_names.append(asset.original.name)
        asset.display.save("display.webp", ContentFile(display_data), save=False)
        saved_names.append(asset.display.name)
        asset.thumbnail.save("thumbnail.webp", ContentFile(thumbnail_data), save=False)
        saved_names.append(asset.thumbnail.name)
    except Exception:
        for name in saved_names:
            storage.delete(name)
        raise
    return saved_names
