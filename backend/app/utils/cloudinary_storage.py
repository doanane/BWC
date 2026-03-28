import uuid

from fastapi import HTTPException, status

from app.core.config import settings


def _ensure_cloudinary_configured() -> tuple[object, object]:
    try:
        import cloudinary
        import cloudinary.uploader
    except ModuleNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary package is not installed. Install dependencies and retry.",
        )

    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary configuration is missing in environment settings.",
        )

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    return cloudinary, cloudinary.uploader


def upload_bytes_to_cloudinary(
    content: bytes,
    *,
    folder: str,
    filename: str,
    resource_type: str = "image",
) -> dict:
    _, uploader = _ensure_cloudinary_configured()
    public_id = f"{folder}/{uuid.uuid4().hex}_{filename.rsplit('.', 1)[0]}"

    result = uploader.upload(
        content,
        public_id=public_id,
        resource_type=resource_type,
        overwrite=False,
        use_filename=False,
        unique_filename=False,
    )

    return {
        "url": result.get("secure_url") or result.get("url"),
        "public_id": result.get("public_id"),
        "resource_type": result.get("resource_type", resource_type),
    }


def delete_from_cloudinary(public_id: str, resource_type: str = "image") -> None:
    _, uploader = _ensure_cloudinary_configured()
    uploader.destroy(public_id, resource_type=resource_type, invalidate=True)
