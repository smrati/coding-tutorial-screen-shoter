import io
import subprocess
import tempfile
import zipfile
from pathlib import Path

import numpy as np
import scipy.io.wavfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.recording import Recording
from app.models.screenshot import Screenshot
from app.schemas.screenshot import ScreenshotMeta
from app import tts as tts_service

router = APIRouter(
    prefix="/api/v1/recordings/{recording_id}/screenshots",
    tags=["screenshots"],
)


async def _get_recording_or_404(recording_id: int, db: AsyncSession) -> Recording:
    recording = await db.get(Recording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording


async def _get_screenshot_or_404(
    recording_id: int, screenshot_id: int, db: AsyncSession
) -> Screenshot:
    await _get_recording_or_404(recording_id, db)
    screenshot = await db.get(Screenshot, screenshot_id)
    if not screenshot or screenshot.recording_id != recording_id:
        raise HTTPException(status_code=404, detail="Screenshot not found")
    return screenshot


@router.post("", response_model=ScreenshotMeta, status_code=201)
async def upload_screenshot(
    recording_id: int,
    image: UploadFile = File(...),
    code_snapshot: str = Form(None),
    narration_text: str = Form(None),
    editor_mode: str = Form("markdown"),
    scene_data: str = Form(None),
    canvas_bg_color: str = Form("#0d1117"),
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
        narration_text=narration_text,
        editor_mode=editor_mode,
        scene_data=scene_data,
        canvas_bg_color=canvas_bg_color,
    )
    db.add(screenshot)
    await db.commit()
    await db.refresh(screenshot)
    return ScreenshotMeta.model_validate_screenshot(screenshot)


@router.put("/{screenshot_id}/image", response_model=ScreenshotMeta)
async def update_screenshot_image(
    recording_id: int,
    screenshot_id: int,
    image: UploadFile = File(...),
    code_snapshot: str = Form(None),
    editor_mode: str = Form("markdown"),
    scene_data: str = Form(None),
    canvas_bg_color: str = Form("#0d1117"),
    db: AsyncSession = Depends(get_db),
):
    screenshot = await _get_screenshot_or_404(recording_id, screenshot_id, db)
    screenshot.image_data = await image.read()
    if code_snapshot is not None:
        screenshot.code_snapshot = code_snapshot
    screenshot.editor_mode = editor_mode
    if scene_data is not None:
        screenshot.scene_data = scene_data
    if canvas_bg_color is not None:
        screenshot.canvas_bg_color = canvas_bg_color
    await db.commit()
    await db.refresh(screenshot)
    return ScreenshotMeta.model_validate_screenshot(screenshot)


@router.post("/{screenshot_id}/clone", response_model=ScreenshotMeta, status_code=201)
async def clone_screenshot(
    recording_id: int,
    screenshot_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _get_recording_or_404(recording_id, db)
    source = await _get_screenshot_or_404(recording_id, screenshot_id, db)

    max_slide = (
        await db.execute(
            select(func.coalesce(func.max(Screenshot.slide_number), 0)).where(
                Screenshot.recording_id == recording_id
            )
        )
    ).scalar() or 0

    clone = Screenshot(
        recording_id=recording_id,
        slide_number=max_slide + 1,
        image_data=source.image_data,
        code_snapshot=source.code_snapshot,
        editor_mode=source.editor_mode,
        scene_data=source.scene_data,
        canvas_bg_color=source.canvas_bg_color,
        narration_text=source.narration_text,
    )
    db.add(clone)
    await db.commit()
    await db.refresh(clone)
    return ScreenshotMeta.model_validate_screenshot(clone)


@router.get("/{screenshot_id}/image")
async def get_screenshot_image(
    recording_id: int, screenshot_id: int, db: AsyncSession = Depends(get_db)
):
    screenshot = await _get_screenshot_or_404(recording_id, screenshot_id, db)
    return Response(content=screenshot.image_data, media_type="image/png")


@router.get("/{screenshot_id}/audio")
async def get_screenshot_audio(
    recording_id: int, screenshot_id: int, db: AsyncSession = Depends(get_db)
):
    screenshot = await _get_screenshot_or_404(recording_id, screenshot_id, db)
    if not screenshot.audio_data:
        raise HTTPException(status_code=404, detail="No audio generated for this slide")
    return Response(content=screenshot.audio_data, media_type="audio/mpeg")


@router.delete("/{screenshot_id}", status_code=204)
async def delete_screenshot(
    recording_id: int, screenshot_id: int, db: AsyncSession = Depends(get_db)
):
    screenshot = await _get_screenshot_or_404(recording_id, screenshot_id, db)

    deleted_slide = screenshot.slide_number
    await db.delete(screenshot)

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


class NarrationUpdate(BaseModel):
    narration_text: str


@router.put("/{screenshot_id}/narration", response_model=ScreenshotMeta)
async def update_narration(
    recording_id: int,
    screenshot_id: int,
    body: NarrationUpdate,
    db: AsyncSession = Depends(get_db),
):
    screenshot = await _get_screenshot_or_404(recording_id, screenshot_id, db)
    screenshot.narration_text = body.narration_text
    if screenshot.audio_data is not None:
        screenshot.audio_data = None
        screenshot.audio_duration = None
    await db.commit()
    await db.refresh(screenshot)
    return ScreenshotMeta.model_validate_screenshot(screenshot)


@router.post("/{screenshot_id}/generate-audio", response_model=ScreenshotMeta)
async def generate_audio(
    recording_id: int,
    screenshot_id: int,
    db: AsyncSession = Depends(get_db),
):
    screenshot = await _get_screenshot_or_404(recording_id, screenshot_id, db)

    if not screenshot.narration_text or not screenshot.narration_text.strip():
        raise HTTPException(
            status_code=400, detail="No narration text set for this slide"
        )

    try:
        mp3_bytes, duration = tts_service.generate_audio(screenshot.narration_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")

    screenshot.audio_data = mp3_bytes
    screenshot.audio_duration = duration
    await db.commit()
    await db.refresh(screenshot)
    return ScreenshotMeta.model_validate_screenshot(screenshot)


class PaddingUpdate(BaseModel):
    left_padding: float = 0.0
    right_padding: float = 0.5


class CanvasUpdate(BaseModel):
    scene_data: str
    canvas_bg_color: str = "#0d1117"


@router.put("/{screenshot_id}/canvas", response_model=ScreenshotMeta)
async def update_canvas(
    recording_id: int,
    screenshot_id: int,
    body: CanvasUpdate,
    db: AsyncSession = Depends(get_db),
):
    screenshot = await _get_screenshot_or_404(recording_id, screenshot_id, db)
    screenshot.scene_data = body.scene_data
    screenshot.canvas_bg_color = body.canvas_bg_color
    await db.commit()
    await db.refresh(screenshot)
    return ScreenshotMeta.model_validate_screenshot(screenshot)


@router.put("/{screenshot_id}/padding", response_model=ScreenshotMeta)
async def update_padding(
    recording_id: int,
    screenshot_id: int,
    body: PaddingUpdate,
    db: AsyncSession = Depends(get_db),
):
    screenshot = await _get_screenshot_or_404(recording_id, screenshot_id, db)
    screenshot.left_padding = body.left_padding
    screenshot.right_padding = body.right_padding
    await db.commit()
    await db.refresh(screenshot)
    return ScreenshotMeta.model_validate_screenshot(screenshot)


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
        tmp = Path(tmpdir)
        segments_dir = tmp / "segments"
        segments_dir.mkdir()

        segment_paths = []

        for i, shot in enumerate(screenshots):
            frame_path = tmp / f"frame_{i:04d}.png"
            frame_path.write_bytes(shot.image_data)

            has_audio = shot.audio_data is not None and shot.audio_duration is not None

            if has_audio:
                total_duration = shot.left_padding + shot.audio_duration + shot.right_padding

                audio_path = tmp / f"audio_{i:04d}.mp3"
                audio_path.write_bytes(shot.audio_data)

                padded_wav = _build_padded_audio(
                    tmpdir, i, shot.left_padding, audio_path, shot.right_padding
                )

                seg_path = segments_dir / f"seg_{i:04d}.mp4"
                cmd = [
                    "ffmpeg", "-y",
                    "-loop", "1", "-i", str(frame_path),
                    "-i", str(padded_wav),
                    "-c:v", "libx264",
                    "-c:a", "aac", "-b:a", "128k",
                    "-ar", "44100", "-ac", "2",
                    "-pix_fmt", "yuv420p",
                    "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0d1117,fps=30,format=yuv420p",
                    "-shortest",
                    str(seg_path),
                ]
            else:
                dur = duration_map.get(shot.id, 2.0)
                seg_path = segments_dir / f"seg_{i:04d}.mp4"
                cmd = [
                    "ffmpeg", "-y",
                    "-loop", "1", "-i", str(frame_path),
                    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                    "-c:v", "libx264",
                    "-c:a", "aac", "-b:a", "128k",
                    "-pix_fmt", "yuv420p",
                    "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0d1117,fps=30,format=yuv420p",
                    "-t", str(dur),
                    "-shortest",
                    str(seg_path),
                ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"ffmpeg segment failed: {result.stderr[-500:]}",
                )
            segment_paths.append(seg_path)

        concat_path = tmp / "concat.txt"
        concat_path.write_text(
            "\n".join(f"file '{p}'" for p in segment_paths)
        )

        output_path = tmp / "output.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_path),
            "-c", "copy",
            str(output_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"ffmpeg concat failed: {result.stderr[-500:]}",
            )

        video_bytes = output_path.read_bytes()

    return Response(
        content=video_bytes,
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{recording.title}.mp4"'
        },
    )


def _build_padded_audio(
    tmpdir: str,
    index: int,
    left_pad: float,
    audio_path: Path,
    right_pad: float,
) -> Path:
    tmp = Path(tmpdir)
    parts = []

    if left_pad > 0:
        left_silence = tmp / f"silence_left_{index:04d}.wav"
        _generate_silence_wav(left_silence, left_pad)
        parts.append(left_silence)

    wav_audio = tmp / f"audio_decoded_{index:04d}.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(audio_path), str(wav_audio)],
        capture_output=True, text=True, timeout=30,
    )
    parts.append(wav_audio)

    if right_pad > 0:
        right_silence = tmp / f"silence_right_{index:04d}.wav"
        _generate_silence_wav(right_silence, right_pad)
        parts.append(right_silence)

    padded_wav = tmp / f"padded_{index:04d}.wav"

    if len(parts) == 1:
        return parts[0]

    filter_parts = "".join(f"[{i}:a]" for i in range(len(parts)))
    cmd = [
        "ffmpeg", "-y",
    ]
    for p in parts:
        cmd.extend(["-i", str(p)])
    cmd.extend([
        "-filter_complex", f"{filter_parts}concat=n={len(parts)}:v=0:a=1[out]",
        "-map", "[out]",
        str(padded_wav),
    ])

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg concat audio failed: {result.stderr[-300:]}")

    return padded_wav


def _generate_silence_wav(path: Path, duration: float):
    sample_rate = 24000
    n_samples = int(sample_rate * duration)
    silence = np.zeros((n_samples,), dtype=np.int16)
    scipy.io.wavfile.write(str(path), sample_rate, silence)
