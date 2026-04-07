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
  codeSnapshot?: string
) => {
  const form = new FormData();
  form.append("image", imageBlob, "screenshot.png");
  if (codeSnapshot) form.append("code_snapshot", codeSnapshot);
  return api
    .post<Screenshot>(`/recordings/${recordingId}/screenshots`, form)
    .then((r) => r.data);
};

export const screenshotImageUrl = (recordingId: number, screenshotId: number) =>
  `/api/v1/recordings/${recordingId}/screenshots/${screenshotId}/image`;

export const deleteScreenshot = (recordingId: number, screenshotId: number) =>
  api.delete(`/recordings/${recordingId}/screenshots/${screenshotId}`);

export const exportScreenshotsUrl = (recordingId: number) =>
  `/api/v1/recordings/${recordingId}/screenshots/export`;
