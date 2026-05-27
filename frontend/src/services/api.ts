import axios from "axios";
import type { Recording, RecordingDetail, Screenshot } from "../types";

const api = axios.create({ baseURL: "/api/v1" });

// Recordings
export const fetchRecordings = () =>
  api.get<Recording[]>("/recordings").then((r) => r.data);

export const fetchRecording = (id: number) =>
  api.get<RecordingDetail>(`/recordings/${id}`).then((r) => r.data);

export const createRecording = (title: string) =>
  api
    .post<Recording>("/recordings", { title })
    .then((r) => r.data);

export const updateRecording = (id: number, title: string) =>
  api
    .put<Recording>(`/recordings/${id}`, { title })
    .then((r) => r.data);

export const deleteRecording = (id: number) =>
  api.delete(`/recordings/${id}`);

// Screenshots
export const uploadScreenshot = (
  recordingId: number,
  imageBlob: Blob,
  options?: {
    codeSnapshot?: string;
    editorMode?: "markdown" | "canvas";
    sceneData?: string;
    canvasBgColor?: string;
  }
) => {
  const form = new FormData();
  form.append("image", imageBlob, "screenshot.png");
  if (options?.codeSnapshot) form.append("code_snapshot", options.codeSnapshot);
  form.append("editor_mode", options?.editorMode ?? "markdown");
  if (options?.sceneData) form.append("scene_data", options.sceneData);
  if (options?.canvasBgColor) form.append("canvas_bg_color", options.canvasBgColor);
  return api
    .post<Screenshot>(`/recordings/${recordingId}/screenshots`, form)
    .then((r) => r.data);
};

export const updateScreenshotImage = (
  recordingId: number,
  screenshotId: number,
  imageBlob: Blob,
  options?: {
    codeSnapshot?: string;
    editorMode?: "markdown" | "canvas";
    sceneData?: string;
    canvasBgColor?: string;
  }
) => {
  const form = new FormData();
  form.append("image", imageBlob, "screenshot.png");
  if (options?.codeSnapshot) form.append("code_snapshot", options.codeSnapshot);
  form.append("editor_mode", options?.editorMode ?? "markdown");
  if (options?.sceneData) form.append("scene_data", options.sceneData);
  if (options?.canvasBgColor) form.append("canvas_bg_color", options.canvasBgColor);
  return api
    .put<Screenshot>(
      `/recordings/${recordingId}/screenshots/${screenshotId}/image`,
      form
    )
    .then((r) => r.data);
};

export const screenshotImageUrl = (recordingId: number, screenshotId: number) =>
  `/api/v1/recordings/${recordingId}/screenshots/${screenshotId}/image`;

export const screenshotAudioUrl = (recordingId: number, screenshotId: number) =>
  `/api/v1/recordings/${recordingId}/screenshots/${screenshotId}/audio`;

export const deleteScreenshot = (recordingId: number, screenshotId: number) =>
  api.delete(`/recordings/${recordingId}/screenshots/${screenshotId}`);

export const updateNarration = (
  recordingId: number,
  screenshotId: number,
  narrationText: string
) =>
  api
    .put<Screenshot>(
      `/recordings/${recordingId}/screenshots/${screenshotId}/narration`,
      { narration_text: narrationText }
    )
    .then((r) => r.data);

export const generateAudio = (recordingId: number, screenshotId: number) =>
  api
    .post<Screenshot>(
      `/recordings/${recordingId}/screenshots/${screenshotId}/generate-audio`
    )
    .then((r) => r.data);

export const updatePadding = (
  recordingId: number,
  screenshotId: number,
  leftPadding: number,
  rightPadding: number
) =>
  api
    .put<Screenshot>(
      `/recordings/${recordingId}/screenshots/${screenshotId}/padding`,
      { left_padding: leftPadding, right_padding: rightPadding }
    )
    .then((r) => r.data);

export const exportScreenshotsUrl = (recordingId: number) =>
  `/api/v1/recordings/${recordingId}/screenshots/export`;

export const exportVideoUrl = (
  recordingId: number,
  slideDurations: Map<number, number>
) => {
  const params = Array.from(slideDurations.entries())
    .map(([id, dur]) => `slides=${id}:${dur}`)
    .join("&");
  return `/api/v1/recordings/${recordingId}/screenshots/export-video?${params}`;
};

export const uploadImage = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append("image", file);
  const res = await api.post<{ url: string }>("/images", form);
  return res.data.url;
};

export const updateCanvas = (
  recordingId: number,
  screenshotId: number,
  sceneData: string,
  canvasBgColor: string
) =>
  api
    .put<Screenshot>(
      `/recordings/${recordingId}/screenshots/${screenshotId}/canvas`,
      { scene_data: sceneData, canvas_bg_color: canvasBgColor }
    )
    .then((r) => r.data);
