import { useCallback, type RefObject } from "react";
import html2canvas from "html2canvas";

export function useScreenshotCapture(
  editorWrapperRef: RefObject<HTMLDivElement | null>
) {
  const capture = useCallback(async (): Promise<Blob> => {
    const el = editorWrapperRef.current;
    if (!el) throw new Error("Editor wrapper not mounted");

    const canvas = await html2canvas(el, {
      backgroundColor: "#1e1e1e",
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (_doc, cloned) => {
        cloned.querySelectorAll(".monaco-editor .cursor").forEach((c) => c.remove());
      },
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    });
  }, [editorWrapperRef]);

  return capture;
}
