import type { Screenshot } from "../types";
import ScreenshotCard from "./ScreenshotCard";

interface Props {
  recordingId: number;
  screenshots: Screenshot[];
  onDelete: (screenshotId: number) => void;
}

export default function ScreenshotPanel({
  recordingId,
  screenshots,
  onDelete,
}: Props) {
  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 overflow-y-auto p-3 space-y-3">
      <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide">
        Slides ({screenshots.length})
      </h3>
      {screenshots.length === 0 ? (
        <p className="text-gray-600 text-sm text-center mt-8">
          Press Ctrl+S or click Screenshot to capture
        </p>
      ) : (
        screenshots.map((s) => (
          <ScreenshotCard
            key={s.id}
            recordingId={recordingId}
            screenshotId={s.id}
            slideNumber={s.slide_number}
            onDelete={() => onDelete(s.id)}
          />
        ))
      )}
    </div>
  );
}
