import { saveAs } from "file-saver";
import { exportVideoUrl } from "../services/api";

function formatExportFilename(recordingTitle: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
  const safeName = recordingTitle.replace(/\s+/g, "_");
  return `${safeName}_${timestamp}`;
}

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
  saveAs(blob, `${formatExportFilename(recordingTitle)}.mp4`);
}
