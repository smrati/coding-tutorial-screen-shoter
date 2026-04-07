import type { Screenshot } from "../types";
import ScreenshotCard from "./ScreenshotCard";

interface Props {
  recordingId: number;
  screenshots: Screenshot[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: (screenshotId: number) => void;
}

export default function ScreenshotPanel({
  recordingId,
  screenshots,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onDelete,
}: Props) {
  const allSelected = screenshots.length > 0 && selectedIds.size === screenshots.length;

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 overflow-y-auto p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide">
          Slides ({selectedIds.size}/{screenshots.length})
        </h3>
        {screenshots.length > 0 && (
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-blue-400 hover:text-blue-300 text-xs"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>
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
            selected={selectedIds.has(s.id)}
            onToggleSelect={() => onToggleSelect(s.id)}
            onDelete={() => onDelete(s.id)}
          />
        ))
      )}
    </div>
  );
}
