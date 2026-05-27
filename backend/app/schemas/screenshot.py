from datetime import datetime

from pydantic import BaseModel


class ScreenshotMeta(BaseModel):
    id: int
    slide_number: int
    code_snapshot: str | None = None
    editor_mode: str = "markdown"
    scene_data: str | None = None
    canvas_bg_color: str | None = "#0d1117"
    narration_text: str | None = None
    has_audio: bool = False
    audio_duration: float | None = None
    left_padding: float = 0.0
    right_padding: float = 0.5
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate_screenshot(cls, screenshot):
        return cls(
            id=screenshot.id,
            slide_number=screenshot.slide_number,
            code_snapshot=screenshot.code_snapshot,
            editor_mode=screenshot.editor_mode,
            scene_data=screenshot.scene_data,
            canvas_bg_color=screenshot.canvas_bg_color,
            narration_text=screenshot.narration_text,
            has_audio=screenshot.audio_data is not None,
            audio_duration=screenshot.audio_duration,
            left_padding=screenshot.left_padding,
            right_padding=screenshot.right_padding,
            created_at=screenshot.created_at,
            updated_at=screenshot.updated_at,
        )
