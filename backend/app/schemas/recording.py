from datetime import datetime


from pydantic import BaseModel


class RecordingCreate(BaseModel):
    title: str


class RecordingUpdate(BaseModel):
    title: str


class RecordingResponse(BaseModel):
    id: int
    title: str
    screenshot_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecordingDetail(RecordingResponse):
    screenshots: list["ScreenshotMeta"] = []

    model_config = {"from_attributes": True}


# Avoid circular import — import ScreenshotMeta at bottom
from app.schemas.screenshot import ScreenshotMeta  # noqa: E402

RecordingDetail.model_rebuild()
