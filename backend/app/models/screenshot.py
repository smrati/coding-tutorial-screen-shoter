from datetime import datetime, timezone

from sqlalchemy import Integer, Float, ForeignKey, Text, LargeBinary, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Screenshot(Base):
    __tablename__ = "screenshots"
    __table_args__ = (
        UniqueConstraint("recording_id", "slide_number", name="uq_recording_slide"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recording_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False
    )
    slide_number: Mapped[int] = mapped_column(Integer, nullable=False)
    image_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    code_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    narration_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    audio_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    left_padding: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    right_padding: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    recording: Mapped["Recording"] = relationship("Recording", back_populates="screenshots")
