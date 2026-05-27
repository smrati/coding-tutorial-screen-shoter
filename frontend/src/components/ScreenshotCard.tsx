import { useState, useRef } from "react";
import { screenshotImageUrl, screenshotAudioUrl } from "../services/api";
import DurationPopover from "./DurationPopover";

interface Props {
  recordingId: number;
  screenshotId: number;
  slideNumber: number;
  editorMode: "markdown" | "canvas";
  selected: boolean;
  duration: number;
  isCustomDuration: boolean;
  narrationText: string | null;
  hasAudio: boolean;
  audioDuration: number | null;
  leftPadding: number;
  rightPadding: number;
  isGeneratingAudio: boolean;
  updatedAt: string | null;
  onToggleSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDurationChange: (duration: number) => void;
  onDurationReset: () => void;
  onNarrationChange: (text: string) => void;
  onGenerateAudio: () => void;
  onPaddingChange: (left: number, right: number) => void;
  onEdit: () => void;
}

export default function ScreenshotCard({
  recordingId,
  screenshotId,
  slideNumber,
  editorMode,
  selected,
  duration,
  isCustomDuration,
  narrationText,
  hasAudio,
  audioDuration,
  leftPadding,
  rightPadding,
  isGeneratingAudio,
  updatedAt,
  onToggleSelect,
  onDelete,
  onPreview,
  onDurationChange,
  onDurationReset,
  onNarrationChange,
  onGenerateAudio,
  onPaddingChange,
  onEdit,
}: Props) {
  const [showNarration, setShowNarration] = useState(false);
  const [showNarrationModal, setShowNarrationModal] = useState(false);
  const [localNarration, setLocalNarration] = useState(narrationText ?? "");
  const [modalNarration, setModalNarration] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const handleNarrationBlur = () => {
    if (localNarration !== (narrationText ?? "")) {
      onNarrationChange(localNarration);
    }
  };

  const openNarrationModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalNarration(localNarration);
    setShowNarrationModal(true);
  };

  const saveNarrationModal = () => {
    setLocalNarration(modalNarration);
    if (modalNarration !== (narrationText ?? "")) {
      onNarrationChange(modalNarration);
    }
    setShowNarrationModal(false);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const imgUrl = screenshotImageUrl(recordingId, screenshotId)
    + (updatedAt ? `?t=${encodeURIComponent(updatedAt)}` : "");

  return (
    <div
      className={`group relative bg-gray-700 rounded-lg overflow-hidden cursor-pointer border-2 ${selected ? "border-blue-500" : "border-transparent"}`}
      onClick={onPreview}
    >
      <img
        src={imgUrl}
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="absolute top-7 right-1 bg-blue-600/80 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
        title="Edit in editor"
      >
        Edit
      </button>
      <span className={`absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded ${
        editorMode === "canvas" ? "bg-purple-600/80 text-white" : "bg-gray-600/80 text-gray-200"
      }`}>
        {editorMode === "canvas" ? "Canvas" : "MD"}
      </span>

      <div className="px-2 py-1.5 bg-gray-800/90 space-y-1">
        <div className="flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNarration(!showNarration);
            }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showNarration ? "Hide" : "Narration"}
          </button>
          <div className="flex items-center gap-1.5">
            {hasAudio && (
              <>
                <span className="text-green-400 text-xs">
                  {audioDuration?.toFixed(1)}s
                </span>
                <button
                  onClick={togglePlay}
                  className="text-white text-xs bg-blue-600 hover:bg-blue-500 px-1.5 py-0.5 rounded"
                >
                  {playing ? "⏹" : "▶"}
                </button>
                <audio
                  ref={audioRef}
                  src={screenshotAudioUrl(recordingId, screenshotId)}
                  onEnded={() => setPlaying(false)}
                />
              </>
            )}
          </div>
        </div>

        {showNarration && (
          <div className="space-y-1">
            <textarea
              value={localNarration}
              onChange={(e) => {
                e.stopPropagation();
                setLocalNarration(e.target.value);
              }}
              onBlur={handleNarrationBlur}
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter narration text..."
              rows={2}
              className="w-full bg-gray-900 text-gray-200 text-xs rounded p-1.5 resize-y outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={openNarrationModal}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Expand
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateAudio();
            }}
            disabled={isGeneratingAudio || !localNarration.trim()}
            className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2 py-0.5 rounded"
          >
            {isGeneratingAudio ? "Generating..." : hasAudio ? "Regenerate" : "Generate"}
          </button>

          {localNarration.trim() && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500">Pad</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={leftPadding}
                onChange={(e) => {
                  e.stopPropagation();
                  onPaddingChange(parseFloat(e.target.value) || 0, rightPadding);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-10 bg-gray-900 text-gray-200 text-xs rounded px-1 py-0.5 text-center outline-none focus:ring-1 focus:ring-blue-500"
                title="Left padding (sec)"
              />
              <span className="text-gray-500">/</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={rightPadding}
                onChange={(e) => {
                  e.stopPropagation();
                  onPaddingChange(leftPadding, parseFloat(e.target.value) || 0);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-10 bg-gray-900 text-gray-200 text-xs rounded px-1 py-0.5 text-center outline-none focus:ring-1 focus:ring-blue-500"
                title="Right padding (sec)"
              />
            </div>
          )}
        </div>
      </div>

      {!hasAudio && (
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
      )}

      {!selected && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      )}

      {showNarrationModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                Slide {slideNumber} — Narration
              </h3>
              <button
                onClick={() => setShowNarrationModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                Esc
              </button>
            </div>
            <textarea
              value={modalNarration}
              onChange={(e) => setModalNarration(e.target.value)}
              placeholder="Enter narration text..."
              rows={12}
              autoFocus
              className="w-full bg-gray-900 text-gray-200 text-sm rounded-lg p-3 resize-y outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNarrationModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveNarrationModal}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
