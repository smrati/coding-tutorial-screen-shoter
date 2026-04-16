import { screenshotImageUrl } from "../services/api";
import DurationPopover from "./DurationPopover";

interface Props {
  recordingId: number;
  screenshotId: number;
  slideNumber: number;
  selected: boolean;
  duration: number;
  isCustomDuration: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDurationChange: (duration: number) => void;
  onDurationReset: () => void;
}

export default function ScreenshotCard({
  recordingId,
  screenshotId,
  slideNumber,
  selected,
  duration,
  isCustomDuration,
  onToggleSelect,
  onDelete,
  onPreview,
  onDurationChange,
  onDurationReset,
}: Props) {
  return (
    <div
      className={`group relative bg-gray-700 rounded-lg overflow-hidden cursor-pointer border-2 ${selected ? "border-blue-500" : "border-transparent"}`}
      onClick={onPreview}
    >
      <img
        src={screenshotImageUrl(recordingId, screenshotId)}
        alt={`Slide ${slideNumber}`}
        className="w-full object-contain"
      />
      <div className="absolute top-1 left-1 flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="accent-blue-500 w-3.5 h-3.5 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {slideNumber}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1 right-1 bg-red-600/80 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
      >
        X
      </button>

      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        <DurationPopover
          value={duration}
          onChange={onDurationChange}
          showReset={isCustomDuration}
          onReset={onDurationReset}
        >
          <span
            className={`text-xs px-1.5 py-0.5 rounded cursor-pointer ${
              isCustomDuration
                ? "bg-blue-600/80 text-white"
                : "bg-black/50 text-gray-400"
            }`}
          >
            {duration}s
          </span>
        </DurationPopover>
      </div>

      {!selected && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      )}
    </div>
  );
}
