import { useEffect, useCallback } from "react";
import { screenshotImageUrl } from "../services/api";
import type { Screenshot } from "../types";

interface Props {
  recordingId: number;
  screenshots: Screenshot[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function SlidePreviewModal({
  recordingId,
  screenshots,
  currentIndex,
  onClose,
  onNavigate,
}: Props) {
  const screenshot = screenshots[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < screenshots.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      else if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
    },
    [onClose, onNavigate, currentIndex, hasPrev, hasNext]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!screenshot) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-10 left-0 right-0 flex items-center justify-between text-white text-sm">
          <span>
            Slide {screenshot.slide_number} of {screenshots.length}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg"
          >
            Esc
          </button>
        </div>

        <div className="relative flex items-center">
          {hasPrev && (
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              className="absolute -left-12 text-white text-3xl hover:text-gray-300 z-10"
            >
              &lsaquo;
            </button>
          )}

          <img
            src={screenshotImageUrl(recordingId, screenshot.id)}
            alt={`Slide ${screenshot.slide_number}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />

          {hasNext && (
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              className="absolute -right-12 text-white text-3xl hover:text-gray-300 z-10"
            >
              &rsaquo;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
