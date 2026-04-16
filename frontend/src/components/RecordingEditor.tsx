import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import type * as monaco from "monaco-editor";
import CodeEditor from "./CodeEditor";
import EditorToolbar from "./EditorToolbar";
import ScreenshotPanel from "./ScreenshotPanel";
import SlidePreviewModal from "./SlidePreviewModal";
import { useScreenshots } from "../hooks/useScreenshots";
import { useScreenshotCapture } from "../hooks/useScreenshotCapture";
import { exportScreenshotsAsZip } from "../utils/zipExport";
import { exportScreenshotsAsVideo } from "../utils/videoExport";

const STORAGE_KEY = (id: number) => `editor_code_${id}`;

const DEFAULT_CODE = `# Write your Python code here
# Press Ctrl+S (Cmd+S on Mac) to capture a screenshot

def hello():
    print('Hello, World!')
`;

export default function RecordingEditor() {
  const { id } = useParams<{ id: string }>();
  const recordingId = Number(id);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [initialCode, setInitialCode] = useState<string | undefined>(undefined);

  const { screenshots, title, refresh, upload, remove } =
    useScreenshots(recordingId);
  const captureScreenshot = useScreenshotCapture(editorWrapperRef);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setSelectedIds(new Set(screenshots.map((s) => s.id)));
  }, [screenshots]);

  useEffect(() => {
    if (screenshots.length === 0) return;

    const stored = localStorage.getItem(STORAGE_KEY(recordingId));
    if (stored !== null) return;

    const lastSnapshot = [...screenshots]
      .reverse()
      .find((s) => s.code_snapshot);

    if (lastSnapshot?.code_snapshot) {
      localStorage.setItem(STORAGE_KEY(recordingId), lastSnapshot.code_snapshot);
      editorRef.current?.setValue(lastSnapshot.code_snapshot);
    }
  }, [screenshots, recordingId]);

  const loadInitialCode = useCallback((): string => {
    const stored = localStorage.getItem(STORAGE_KEY(recordingId));
    if (stored !== null) return stored;

    const lastSnapshot = [...screenshots]
      .reverse()
      .find((s) => s.code_snapshot);
    if (lastSnapshot?.code_snapshot) return lastSnapshot.code_snapshot;

    return DEFAULT_CODE;
  }, [screenshots, recordingId]);

  useEffect(() => {
    setInitialCode(loadInitialCode());
  }, [loadInitialCode]);

  const handleCodeChange = useCallback(
    (value: string) => {
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

  const handleEditorReady = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
    },
    []
  );

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const code = editorRef.current?.getValue() || "";
      const blob = await captureScreenshot();
      await upload(blob, code);
    } catch (err) {
      console.error("Screenshot failed:", err);
    } finally {
      setCapturing(false);
    }
  }, [capturing, captureScreenshot, upload]);

  // Ctrl+S / Cmd+S shortcut
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

  const handleExportVideo = useCallback(async () => {
    const selectedIdsArr = screenshots
      .filter((s) => selectedIds.has(s.id))
      .map((s) => s.id);
    if (selectedIdsArr.length === 0) return;
    setExportingVideo(true);
    try {
      await exportScreenshotsAsVideo(recordingId, selectedIdsArr, title);
    } catch (err) {
      console.error("Video export failed:", err);
    } finally {
      setExportingVideo(false);
    }
  }, [recordingId, screenshots, selectedIds, title]);

  const handlePreview = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewIndex(null);
  }, []);

  const handleNavigatePreview = useCallback((index: number) => {
    setPreviewIndex(index);
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
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 p-2">
          <CodeEditor
            onEditorReady={handleEditorReady}
            wrapperRef={editorWrapperRef}
            initialValue={initialCode}
            onChange={handleCodeChange}
          />
        </div>
        <ScreenshotPanel
          recordingId={recordingId}
          screenshots={screenshots}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onDelete={remove}
          onPreview={handlePreview}
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
