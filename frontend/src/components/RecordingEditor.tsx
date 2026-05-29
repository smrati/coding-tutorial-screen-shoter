import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import MarkdownEditor, { DEFAULT_MARKDOWN } from "./MarkdownEditor";
import CanvasEditor, { type CanvasEditorHandle } from "./CanvasEditor";
import EditorModeSwitcher from "./EditorModeSwitcher";
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
  updateScreenshotImage as apiUpdateScreenshotImage,
} from "../services/api";

const STORAGE_KEY = (id: number) => `editor_code_${id}`;

export default function RecordingEditor() {
  const { id } = useParams<{ id: string }>();
  const recordingId = Number(id);
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<CanvasEditorHandle>(null);
  const [capturing, setCapturing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [editorValue, setEditorValue] = useState<string | undefined>(undefined);
  const [globalDuration, setGlobalDuration] = useState(2.0);
  const [slideDurations, setSlideDurations] = useState<Map<number, number>>(new Map());
  const [audioGeneratingIds, setAudioGeneratingIds] = useState<Set<number>>(new Set());
  const [exportWarning, setExportWarning] = useState<string | null>(null);

  const [editorMode, setEditorMode] = useState<"markdown" | "canvas">("markdown");
  const [canvasBgColor, setCanvasBgColor] = useState("#0d1117");
  const [canvasSceneData, setCanvasSceneData] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { screenshots, title, refresh, upload, clone, remove, updateScreenshot } =
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
      let blob: Blob;
      let options: Parameters<typeof upload>[1];

      if (editorMode === "canvas") {
        blob = await canvasRef.current!.exportImage(canvasBgColor);
        options = {
          editorMode: "canvas",
          sceneData: canvasRef.current?.getSceneData() ?? canvasSceneData ?? undefined,
          canvasBgColor,
        };
      } else {
        blob = await captureScreenshot();
        options = {
          codeSnapshot: editorValue || undefined,
          editorMode: "markdown",
        };
      }

      if (editingSlideId) {
        const updated = await apiUpdateScreenshotImage(recordingId, editingSlideId, blob, options);
        updateScreenshot(updated);
        setEditingSlideId(null);
      } else {
        await upload(blob, options);
      }
    } catch (err) {
      console.error("Screenshot failed:", err);
    } finally {
      setCapturing(false);
    }
  }, [capturing, captureScreenshot, upload, editorValue, editorMode, canvasBgColor, canvasSceneData, editingSlideId, updateScreenshot]);

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
      const updated = await apiUpdatePadding(recordingId, screenshotId, left, right);
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

  const handleEditSlide = useCallback((screenshotId: number) => {
    const slide = screenshots.find((s) => s.id === screenshotId);
    if (!slide) return;

    setEditingSlideId(screenshotId);
    setEditorMode(slide.editor_mode);

    if (slide.editor_mode === "markdown" && slide.code_snapshot) {
      setEditorValue(slide.code_snapshot);
    } else if (slide.editor_mode === "canvas") {
      setCanvasSceneData(slide.scene_data);
      if (slide.canvas_bg_color) setCanvasBgColor(slide.canvas_bg_color);
      setCanvasKey((k) => k + 1);
    }
  }, [screenshots]);

  const handleDeleteSlide = useCallback(
    async (screenshotId: number) => {
      if (editingSlideId === screenshotId) {
        setEditingSlideId(null);
        if (editorMode === "canvas") {
          setCanvasSceneData(null);
          setCanvasKey((k) => k + 1);
        }
      }
      await remove(screenshotId);
    },
    [editingSlideId, editorMode, remove]
  );

  const handleCloneSlide = useCallback(
    async (screenshotId: number) => {
      const cloned = await clone(screenshotId);
      if (cloned) {
        setSelectedIds((prev) => new Set(prev).add(cloned.id));
      }
    },
    [clone]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingSlideId(null);
    if (editorMode === "canvas") {
      setCanvasSceneData(null);
      setCanvasKey((k) => k + 1);
    }
  }, [editorMode]);

  const editingSlideNumber = editingSlideId
    ? screenshots.find((s) => s.id === editingSlideId)?.slide_number ?? null
    : null;

  const handleCanvasSceneChange = useCallback((sceneJson: string) => {
    setCanvasSceneData(sceneJson);
  }, []);

  const handleCanvasBgColorChange = useCallback((color: string) => {
    setCanvasBgColor(color);
  }, []);

  const handleModeChange = useCallback((mode: "markdown" | "canvas") => {
    setEditorMode(mode);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

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

  const editorContent = (
    <div className="aspect-video w-full max-h-full border border-gray-700 rounded-lg overflow-hidden">
      {editorMode === "markdown" ? (
        <MarkdownEditor
          initialValue={editorValue}
          value={editorValue ?? ""}
          onChange={handleEditorChange}
          previewRef={previewRef}
        />
      ) : (
        <CanvasEditor
          key={canvasKey}
          ref={canvasRef}
          sceneData={canvasSceneData}
          bgColor={canvasBgColor}
          onSceneChange={handleCanvasSceneChange}
          onBgColorChange={handleCanvasBgColorChange}
        />
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800/90 backdrop-blur rounded-lg px-3 py-2 shadow-lg">
          {editingSlideNumber !== null && (
            <span className="text-amber-300 text-xs font-medium">
              Editing #{editingSlideNumber}
            </span>
          )}
          <button
            onClick={handleCapture}
            disabled={capturing}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded transition"
          >
            {capturing ? "Saving..." : editingSlideNumber !== null ? "Save Edit" : "Screenshot"}
          </button>
          {editingSlideNumber !== null && (
            <button
              onClick={handleCancelEdit}
              className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-3 py-1.5 rounded transition"
            >
              Cancel
            </button>
          )}
          <span className={`text-xs px-2 py-1 rounded ${
            editorMode === "canvas" ? "bg-purple-600/80 text-white" : "bg-gray-600/80 text-gray-200"
          }`}>
            {editorMode === "canvas" ? "Canvas" : "MD"}
          </span>
          <button
            onClick={handleToggleFullscreen}
            className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-3 py-1.5 rounded transition"
          >
            Exit
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          {editorContent}
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

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-950">
      <EditorToolbar
        title={title}
        editingSlideNumber={editingSlideNumber}
        onCapture={handleCapture}
        onExport={handleExport}
        onExportVideo={handleExportVideo}
        onCancelEdit={handleCancelEdit}
        onToggleFullscreen={handleToggleFullscreen}
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
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-4 pt-2 flex items-center">
            <EditorModeSwitcher mode={editorMode} onModeChange={handleModeChange} />
          </div>
          {editingSlideNumber !== null && (
            <div className="mx-4 mt-2 flex items-center justify-between bg-amber-900/60 border border-amber-700/50 text-amber-200 text-sm px-3 py-1.5 rounded-lg">
              <span>Editing Slide #{editingSlideNumber} — press Ctrl+S or click Save Edit</span>
              <button
                onClick={handleCancelEdit}
                className="text-amber-400 hover:text-white text-sm ml-3"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center bg-gray-950 p-4">
            {editorContent}
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
          onDelete={handleDeleteSlide}
          onPreview={handlePreview}
          onGlobalDurationChange={handleGlobalDurationChange}
          onSlideDurationChange={handleSlideDurationChange}
          onSlideDurationReset={handleSlideDurationReset}
          onNarrationChange={handleNarrationChange}
          onGenerateAudio={handleGenerateAudio}
          onPaddingChange={handlePaddingChange}
          onEditSlide={handleEditSlide}
          onCloneSlide={handleCloneSlide}
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
