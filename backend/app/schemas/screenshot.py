from datetime import datetime

from pydantic import BaseModel


class ScreenshotMeta(BaseModel):
    id: int
    slide_number: int
    code_snapshot: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
