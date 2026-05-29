import type { Screenshot } from "../types";
import ScreenshotCard from "./ScreenshotCard";
import DurationPopover from "./DurationPopover";

interface Props {
  recordingId: number;
  screenshots: Screenshot[];
  selectedIds: Set<number>;
  globalDuration: number;
  slideDurations: Map<number, number>;
  audioGeneratingIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: (screenshotId: number) => void;
  onPreview: (index: number) => void;
  onGlobalDurationChange: (duration: number) => void;
  onSlideDurationChange: (id: number, duration: number) => void;
  onSlideDurationReset: (id: number) => void;
  onNarrationChange: (id: number, text: string) => void;
  onGenerateAudio: (id: number) => void;
  onPaddingChange: (id: number, left: number, right: number) => void;
  onEditSlide: (screenshotId: number) => void;
  onCloneSlide: (screenshotId: number) => void;
}

export default function ScreenshotPanel({
  recordingId,
  screenshots,
  selectedIds,
  globalDuration,
  slideDurations,
  audioGeneratingIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onPreview,
  onGlobalDurationChange,
  onSlideDurationChange,
  onSlideDurationReset,
  onNarrationChange,
  onGenerateAudio,
  onPaddingChange,
  onEditSlide,
  onCloneSlide,
}: Props) {
  const allSelected = screenshots.length > 0 && selectedIds.size === screenshots.length;

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto p-3 space-y-3">
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
      {screenshots.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Default duration</span>
          <DurationPopover
            value={globalDuration}
            onChange={onGlobalDurationChange}
          >
            <span className="text-gray-300 text-xs bg-gray-700 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600">
              {globalDuration}s
            </span>
          </DurationPopover>
        </div>
      )}
      {screenshots.length === 0 ? (
        <p className="text-gray-600 text-sm text-center mt-8">
          Press Ctrl+S or click Screenshot to capture
        </p>
      ) : (
        screenshots.map((s, index) => {
          const custom = slideDurations.get(s.id);
          const duration = custom ?? globalDuration;
          return (
            <ScreenshotCard
              key={s.id}
              recordingId={recordingId}
              screenshotId={s.id}
              slideNumber={s.slide_number}
              editorMode={s.editor_mode}
              selected={selectedIds.has(s.id)}
              duration={duration}
              isCustomDuration={custom !== undefined}
              narrationText={s.narration_text}
              hasAudio={s.has_audio}
              audioDuration={s.audio_duration}
              leftPadding={s.left_padding}
              rightPadding={s.right_padding}
              isGeneratingAudio={audioGeneratingIds.has(s.id)}
              updatedAt={s.updated_at}
              onToggleSelect={() => onToggleSelect(s.id)}
              onDelete={() => onDelete(s.id)}
              onPreview={() => onPreview(index)}
              onDurationChange={(d) => onSlideDurationChange(s.id, d)}
              onDurationReset={() => onSlideDurationReset(s.id)}
              onNarrationChange={(text) => onNarrationChange(s.id, text)}
              onGenerateAudio={() => onGenerateAudio(s.id)}
              onPaddingChange={(left, right) => onPaddingChange(s.id, left, right)}
              onEdit={() => onEditSlide(s.id)}
              onClone={() => onCloneSlide(s.id)}
            />
          );
        })
      )}
    </div>
  );
}
