import io
import zipfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.recording import Recording
from app.models.screenshot import Screenshot
from app.schemas.screenshot import ScreenshotMeta

router = APIRouter(
    prefix="/api/v1/recordings/{recording_id}/screenshots",
    tags=["screenshots"],
)


async def _get_recording_or_404(recording_id: int, db: AsyncSession) -> Recording:
    recording = await db.get(Recording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording


@router.post("", response_model=ScreenshotMeta, status_code=201)
async def upload_screenshot(
    recording_id: int,
    image: UploadFile = File(...),
    code_snapshot: str = Form(None),
    db: AsyncSession = Depends(get_db),
):
    await _get_recording_or_404(recording_id, db)

    image_data = await image.read()

    max_slide = (
        await db.execute(
            select(func.coalesce(func.max(Screenshot.slide_number), 0)).where(
                Screenshot.recording_id == recording_id
            )
        )
    ).scalar() or 0

    screenshot = Screenshot(
        recording_id=recording_id,
        slide_number=max_slide + 1,
        image_data=image_data,
        code_snapshot=code_snapshot,
    )
    db.add(screenshot)
    await db.commit()
    await db.refresh(screenshot)
    return screenshot


@router.get("/{screenshot_id}/image")
async def get_screenshot_image(
    recording_id: int, screenshot_id: int, db: AsyncSession = Depends(get_db)
):
    await _get_recording_or_404(recording_id, db)

    screenshot = await db.get(Screenshot, screenshot_id)
    if not screenshot or screenshot.recording_id != recording_id:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    return Response(content=screenshot.image_data, media_type="image/png")


@router.delete("/{screenshot_id}", status_code=204)
async def delete_screenshot(
    recording_id: int, screenshot_id: int, db: AsyncSession = Depends(get_db)
):
    await _get_recording_or_404(recording_id, db)

    screenshot = await db.get(Screenshot, screenshot_id)
    if not screenshot or screenshot.recording_id != recording_id:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    deleted_slide = screenshot.slide_number
    await db.delete(screenshot)

    # Re-number subsequent slides
    subsequent = (
        await db.execute(
            select(Screenshot)
            .where(
                Screenshot.recording_id == recording_id,
                Screenshot.slide_number > deleted_slide,
            )
            .order_by(Screenshot.slide_number)
        )
    ).scalars().all()

    for s in subsequent:
        s.slide_number -= 1

    await db.commit()


@router.get("/export")
async def export_screenshots(
    recording_id: int, db: AsyncSession = Depends(get_db)
):
    recording = await _get_recording_or_404(recording_id, db)

    screenshots = (
        await db.execute(
            select(Screenshot)
            .where(Screenshot.recording_id == recording_id)
            .order_by(Screenshot.slide_number)
        )
    ).scalars().all()

    if not screenshots:
        raise HTTPException(status_code=404, detail="No screenshots to export")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for shot in screenshots:
            zf.writestr(f"{shot.slide_number}.png", shot.image_data)
    buf.seek(0)

    return Response(
        content=buf.read(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{recording.title}.zip"'
        },
    )
