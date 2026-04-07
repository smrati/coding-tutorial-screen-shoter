import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Screenshot } from "../types";
import { screenshotImageUrl } from "../services/api";

export async function exportScreenshotsAsZip(
  recordingId: number,
  screenshots: Screenshot[],
  recordingTitle: string
) {
  const zip = new JSZip();

  for (const shot of screenshots) {
    const url = screenshotImageUrl(recordingId, shot.id);
    const resp = await fetch(url);
    const blob = await resp.blob();
    zip.file(`${shot.slide_number}.png`, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${recordingTitle}.zip`);
}
