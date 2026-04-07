from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.recording import Recording
from app.models.screenshot import Screenshot
from app.schemas.recording import RecordingCreate, RecordingDetail, RecordingResponse, RecordingUpdate

router = APIRouter(prefix="/api/v1/recordings", tags=["recordings"])


@router.get("", response_model=list[RecordingResponse])
async def list_recordings(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            Recording.id,
            Recording.title,
            Recording.created_at,
            Recording.updated_at,
            func.count(Screenshot.id).label("screenshot_count"),
        )
        .outerjoin(Screenshot, Recording.id == Screenshot.recording_id)
        .group_by(Recording.id)
        .order_by(Recording.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        RecordingResponse(
            id=r.id,
            title=r.title,
            screenshot_count=r.screenshot_count,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post("", response_model=RecordingResponse, status_code=201)
async def create_recording(body: RecordingCreate, db: AsyncSession = Depends(get_db)):
    recording = Recording(title=body.title)
    db.add(recording)
    await db.commit()
    await db.refresh(recording)
    return RecordingResponse(
        id=recording.id,
        title=recording.title,
        screenshot_count=0,
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )


@router.get("/{recording_id}", response_model=RecordingDetail)
async def get_recording(recording_id: int, db: AsyncSession = Depends(get_db)):
    recording = await db.get(Recording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    screenshots = (
        await db.execute(
            select(Screenshot)
            .where(Screenshot.recording_id == recording_id)
            .order_by(Screenshot.slide_number)
        )
    ).scalars().all()

    return RecordingDetail(
        id=recording.id,
        title=recording.title,
        screenshot_count=len(screenshots),
        created_at=recording.created_at,
        updated_at=recording.updated_at,
        screenshots=screenshots,
    )


@router.put("/{recording_id}", response_model=RecordingResponse)
async def update_recording(
    recording_id: int, body: RecordingUpdate, db: AsyncSession = Depends(get_db)
):
    recording = await db.get(Recording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    recording.title = body.title
    await db.commit()
    await db.refresh(recording)

    count = (
        await db.execute(
            select(func.count()).where(Screenshot.recording_id == recording_id)
        )
    ).scalar() or 0

    return RecordingResponse(
        id=recording.id,
        title=recording.title,
        screenshot_count=count,
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )


@router.delete("/{recording_id}", status_code=204)
async def delete_recording(recording_id: int, db: AsyncSession = Depends(get_db)):
    recording = await db.get(Recording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    await db.delete(recording)
    await db.commit()
