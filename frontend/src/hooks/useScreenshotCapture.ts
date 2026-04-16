import { useCallback, type RefObject } from "react";
import html2canvas from "html2canvas";

export function useScreenshotCapture(
  previewRef: RefObject<HTMLDivElement | null>
) {
  const capture = useCallback(async (): Promise<Blob> => {
    const el = previewRef.current;
    if (!el) throw new Error("Preview pane not mounted");

    const canvas = await html2canvas(el, {
      backgroundColor: "#0d1117",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    });
  }, [previewRef]);

  return capture;
}
