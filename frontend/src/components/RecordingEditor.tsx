import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import MarkdownEditor, { DEFAULT_MARKDOWN } from "./MarkdownEditor";
import EditorToolbar from "./EditorToolbar";
import ScreenshotPanel from "./ScreenshotPanel";
import SlidePreviewModal from "./SlidePreviewModal";
import { useScreenshots } from "../hooks/useScreenshots";
import { useScreenshotCapture } from "../hooks/useScreenshotCapture";
import { exportScreenshotsAsZip } from "../utils/zipExport";
import { exportScreenshotsAsVideo } from "../utils/videoExport";
import {
  updateNarration as apiUpdateNarration,
  generateAudio as apiGenerateAudio,
  updatePadding as apiUpdatePadding,
} from "../services/api";

const STORAGE_KEY = (id: number) => `editor_code_${id}`;

export default function RecordingEditor() {
  const { id } = useParams<{ id: string }>();
  const recordingId = Number(id);
  const previewRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [editorValue, setEditorValue] = useState<string | undefined>(undefined);
  const [globalDuration, setGlobalDuration] = useState(2.0);
  const [slideDurations, setSlideDurations] = useState<Map<number, number>>(
    new Map()
  );
  const [audioGeneratingIds, setAudioGeneratingIds] = useState<Set<number>>(
    new Set()
  );
  const [exportWarning, setExportWarning] = useState<string | null>(null);

  const { screenshots, title, refresh, upload, remove, updateScreenshot } =
    useScreenshots(recordingId);
  const captureScreenshot = useScreenshotCapture(previewRef);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setSelectedIds(new Set(screenshots.map((s) => s.id)));
  }, [screenshots]);

  const loadInitialValue = useCallback((): string => {
    const stored = localStorage.getItem(STORAGE_KEY(recordingId));
    if (stored !== null) return stored;

    const lastSnapshot = [...screenshots]
      .reverse()
      .find((s) => s.code_snapshot);
    if (lastSnapshot?.code_snapshot) return lastSnapshot.code_snapshot;

    return DEFAULT_MARKDOWN;
  }, [screenshots, recordingId]);

  useEffect(() => {
    setEditorValue(loadInitialValue());
  }, [loadInitialValue]);

  const handleEditorChange = useCallback(
    (value: string) => {
      setEditorValue(value);
      localStorage.setItem(STORAGE_KEY(recordingId), value);
    },
    [recordingId]
  );

  const toggleSelect = useCallback((screenshotId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(screenshotId)) next.delete(screenshotId);
      else next.add(screenshotId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(screenshots.map((s) => s.id)));
  }, [screenshots]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const code = editorValue || "";
      const blob = await captureScreenshot();
      await upload(blob, code);
    } catch (err) {
      console.error("Screenshot failed:", err);
    } finally {
      setCapturing(false);
    }
  }, [capturing, captureScreenshot, upload, editorValue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleCapture();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCapture]);

  const handleExport = useCallback(async () => {
    const selected = screenshots.filter((s) => selectedIds.has(s.id));
    if (selected.length === 0) return;
    await exportScreenshotsAsZip(recordingId, selected, title);
  }, [recordingId, screenshots, selectedIds, title]);

  const handleNarrationChange = useCallback(
    async (screenshotId: number, text: string) => {
      const updated = await apiUpdateNarration(recordingId, screenshotId, text);
      updateScreenshot(updated);
    },
    [recordingId, updateScreenshot]
  );

  const handleGenerateAudio = useCallback(
    async (screenshotId: number) => {
      setAudioGeneratingIds((prev) => new Set(prev).add(screenshotId));
      try {
        const updated = await apiGenerateAudio(recordingId, screenshotId);
        updateScreenshot(updated);
      } catch (err) {
        console.error("Audio generation failed:", err);
      } finally {
        setAudioGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(screenshotId);
          return next;
        });
      }
    },
    [recordingId, updateScreenshot]
  );

  const handlePaddingChange = useCallback(
    async (screenshotId: number, left: number, right: number) => {
      const updated = await apiUpdatePadding(
        recordingId,
        screenshotId,
        left,
        right
      );
      updateScreenshot(updated);
    },
    [recordingId, updateScreenshot]
  );

  const handleExportVideo = useCallback(async () => {
    const selected = screenshots.filter((s) => selectedIds.has(s.id));
    if (selected.length === 0) return;

    const unready = selected.filter(
      (s) => s.narration_text && s.narration_text.trim() && !s.has_audio
    );
    if (unready.length > 0) {
      setExportWarning(
        `${unready.length} slide(s) have narration text but no generated audio. Generate audio first or remove narration text.`
      );
      return;
    }
    setExportWarning(null);

    setExportingVideo(true);
    try {
      const slideDurationMap = new Map(
        selected.map((s) => {
          if (s.has_audio && s.audio_duration != null) {
            return [s.id, s.left_padding + s.audio_duration + s.right_padding];
          }
          const custom = slideDurations.get(s.id);
          return [s.id, custom ?? globalDuration];
        })
      );
      await exportScreenshotsAsVideo(recordingId, slideDurationMap, title);
    } catch (err) {
      console.error("Video export failed:", err);
    } finally {
      setExportingVideo(false);
    }
  }, [recordingId, screenshots, selectedIds, title, globalDuration, slideDurations]);

  const handlePreview = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewIndex(null);
  }, []);

  const handleNavigatePreview = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const handleGlobalDurationChange = useCallback((d: number) => {
    setGlobalDuration(d);
  }, []);

  const handleSlideDurationChange = useCallback(
    (id: number, d: number) => {
      setSlideDurations((prev) => {
        const next = new Map(prev);
        next.set(id, d);
        return next;
      });
    },
    []
  );

  const handleSlideDurationReset = useCallback((id: number) => {
    setSlideDurations((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-950">
      <EditorToolbar
        title={title}
        onCapture={handleCapture}
        onExport={handleExport}
        onExportVideo={handleExportVideo}
        capturing={capturing}
        exportingVideo={exportingVideo}
      />
      {exportWarning && (
        <div className="bg-yellow-900/80 text-yellow-200 text-sm px-4 py-2 flex items-center justify-between">
          <span>{exportWarning}</span>
          <button
            onClick={() => setExportWarning(null)}
            className="text-yellow-400 hover:text-white ml-4"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex items-center justify-center bg-gray-950 p-4">
          <div className="aspect-video w-full max-h-full border border-gray-700 rounded-lg overflow-hidden">
            <MarkdownEditor
              initialValue={editorValue}
              value={editorValue ?? ""}
              onChange={handleEditorChange}
              previewRef={previewRef}
            />
          </div>
        </div>
        <ScreenshotPanel
          recordingId={recordingId}
          screenshots={screenshots}
          selectedIds={selectedIds}
          globalDuration={globalDuration}
          slideDurations={slideDurations}
          audioGeneratingIds={audioGeneratingIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onDelete={remove}
          onPreview={handlePreview}
          onGlobalDurationChange={handleGlobalDurationChange}
          onSlideDurationChange={handleSlideDurationChange}
          onSlideDurationReset={handleSlideDurationReset}
          onNarrationChange={handleNarrationChange}
          onGenerateAudio={handleGenerateAudio}
          onPaddingChange={handlePaddingChange}
        />
      </div>
      {previewIndex !== null && (
        <SlidePreviewModal
          recordingId={recordingId}
          screenshots={screenshots}
          currentIndex={previewIndex}
          onClose={handleClosePreview}
          onNavigate={handleNavigatePreview}
        />
      )}
    </div>
  );
}
