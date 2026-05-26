from datetime import datetime

from pydantic import BaseModel


class ScreenshotMeta(BaseModel):
    id: int
    slide_number: int
    code_snapshot: str | None = None
    narration_text: str | None = None
    has_audio: bool = False
    audio_duration: float | None = None
    left_padding: float = 0.0
    right_padding: float = 0.5
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate_screenshot(cls, screenshot):
        return cls(
            id=screenshot.id,
            slide_number=screenshot.slide_number,
            code_snapshot=screenshot.code_snapshot,
            narration_text=screenshot.narration_text,
            has_audio=screenshot.audio_data is not None,
            audio_duration=screenshot.audio_duration,
            left_padding=screenshot.left_padding,
            right_padding=screenshot.right_padding,
            created_at=screenshot.created_at,
        )
