import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import type * as monaco from "monaco-editor";
import CodeEditor from "./CodeEditor";
import EditorToolbar from "./EditorToolbar";
import ScreenshotPanel from "./ScreenshotPanel";
import { useScreenshots } from "../hooks/useScreenshots";
import { useScreenshotCapture } from "../hooks/useScreenshotCapture";
import { exportScreenshotsAsZip } from "../utils/zipExport";

export default function RecordingEditor() {
  const { id } = useParams<{ id: string }>();
  const recordingId = Number(id);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  const { screenshots, title, refresh, upload, remove } =
    useScreenshots(recordingId);
  const captureScreenshot = useScreenshotCapture(editorWrapperRef);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    if (screenshots.length === 0) return;
    await exportScreenshotsAsZip(recordingId, screenshots, title);
  }, [recordingId, screenshots, title]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-950">
      <EditorToolbar
        title={title}
        onCapture={handleCapture}
        onExport={handleExport}
        capturing={capturing}
      />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 p-2">
          <CodeEditor
            onEditorReady={handleEditorReady}
            wrapperRef={editorWrapperRef}
          />
        </div>
        <ScreenshotPanel
          recordingId={recordingId}
          screenshots={screenshots}
          onDelete={remove}
        />
      </div>
    </div>
  );
}
