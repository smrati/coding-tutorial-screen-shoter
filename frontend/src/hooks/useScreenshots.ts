import { useState, useCallback } from "react";
import type { Screenshot } from "../types";
import {
  fetchRecording,
  uploadScreenshot,
  deleteScreenshot as apiDelete,
} from "../services/api";

export function useScreenshots(recordingId: number | null) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [title, setTitle] = useState("");

  const refresh = useCallback(async () => {
    if (!recordingId) return;
    const detail = await fetchRecording(recordingId);
    setScreenshots(detail.screenshots);
    setTitle(detail.title);
  }, [recordingId]);

  const upload = useCallback(
    async (
      imageBlob: Blob,
      options?: {
        codeSnapshot?: string;
        editorMode?: "markdown" | "canvas";
        sceneData?: string;
        canvasBgColor?: string;
      }
    ) => {
      if (!recordingId) return;
      const shot = await uploadScreenshot(recordingId, imageBlob, options);
      setScreenshots((prev) => [...prev, shot]);
      return shot;
    },
    [recordingId]
  );

  const remove = useCallback(
    async (screenshotId: number) => {
      if (!recordingId) return;
      await apiDelete(recordingId, screenshotId);
      setScreenshots((prev) =>
        prev
          .filter((s) => s.id !== screenshotId)
          .map((s, i) => ({ ...s, slide_number: i + 1 }))
      );
    },
    [recordingId]
  );

  const updateScreenshot = useCallback((updated: Screenshot) => {
    setScreenshots((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
  }, []);

  return { screenshots, title, refresh, upload, remove, updateScreenshot };
}
