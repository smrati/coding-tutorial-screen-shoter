import { saveAs } from "file-saver";
import { exportVideoUrl } from "../services/api";

export async function exportScreenshotsAsVideo(
  recordingId: number,
  screenshotIds: number[],
  recordingTitle: string,
  duration: number = 2.0
) {
  const url = exportVideoUrl(recordingId, screenshotIds, duration);
  const resp = await fetch(url);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err);
  }
  const blob = await resp.blob();
  saveAs(blob, `${recordingTitle}.mp4`);
}
