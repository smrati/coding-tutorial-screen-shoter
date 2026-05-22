import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response

IMAGES_DIR = Path(__file__).resolve().parent.parent / "data" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/v1/images", tags=["images"])


@router.post("")
async def upload_image(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = image.content_type.split("/")[-1]
    if ext == "svg+xml":
        ext = "svg"

    filename = f"{uuid.uuid4().hex}.{ext}"
    dest = IMAGES_DIR / filename
    dest.write_bytes(await image.read())

    return {"url": f"/api/v1/images/{filename}"}


@router.get("/{filename}")
async def serve_image(filename: str):
    path = IMAGES_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    ext = path.suffix.lstrip(".")
    media_map = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "webp": "image/webp",
        "bmp": "image/bmp",
    }
    media_type = media_map.get(ext, "application/octet-stream")

    return Response(content=path.read_bytes(), media_type=media_type)
