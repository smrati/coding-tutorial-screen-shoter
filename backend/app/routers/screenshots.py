import io
import subprocess
import tempfile
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
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


@router.get("/export-video")
async def export_video(
    recording_id: int,
    slides: list[str] = Query(
        ..., description="Format: screenshot_id:duration, e.g. 1:2.0&slides=2:3.5"
    ),
    db: AsyncSession = Depends(get_db),
):
    recording = await _get_recording_or_404(recording_id, db)

    slide_specs = []
    for spec in slides:
        try:
            sid, dur = spec.split(":")
            slide_specs.append((int(sid), float(dur)))
        except (ValueError, IndexError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid slide spec '{spec}'. Use id:duration format.",
            )

    if not slide_specs:
        raise HTTPException(status_code=404, detail="No slides to export")

    ids = [s[0] for s in slide_specs]
    duration_map = dict(slide_specs)

    screenshots = (
        await db.execute(
            select(Screenshot)
            .where(
                Screenshot.recording_id == recording_id,
                Screenshot.id.in_(ids),
            )
            .order_by(Screenshot.slide_number)
        )
    ).scalars().all()

    if not screenshots:
        raise HTTPException(status_code=404, detail="No screenshots to export")

    with tempfile.TemporaryDirectory() as tmpdir:
        frames_dir = Path(tmpdir) / "frames"
        frames_dir.mkdir()

        concat_lines = []
        for i, shot in enumerate(screenshots):
            frame_path = frames_dir / f"frame_{i:04d}.png"
            frame_path.write_bytes(shot.image_data)
            dur = duration_map.get(shot.id, 2.0)
            concat_lines.append(f"file '{frame_path}'")
            concat_lines.append(f"duration {dur}")

        if screenshots:
            last_frame = frames_dir / f"frame_{len(screenshots) - 1:04d}.png"
            concat_lines.append(f"file '{last_frame}'")

        concat_path = Path(tmpdir) / "concat.txt"
        concat_path.write_text("\n".join(concat_lines))

        output_path = Path(tmpdir) / "output.mp4"

        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_path),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-vf", "fps=30,format=yuv420p",
            str(output_path),
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"ffmpeg failed: {result.stderr[-500:]}",
            )

        video_bytes = output_path.read_bytes()

    return Response(
        content=video_bytes,
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{recording.title}.mp4"'
        },
    )
