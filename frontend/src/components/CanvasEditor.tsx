import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Excalidraw, exportToBlob as excalidrawExportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

export interface CanvasEditorHandle {
  exportImage: (bgColor: string) => Promise<Blob>;
  getSceneData: () => string;
}

interface Props {
  sceneData: string | null;
  bgColor: string;
  onSceneChange: (sceneJson: string) => void;
  onBgColorChange: (color: string) => void;
}

const CanvasEditor = forwardRef<CanvasEditorHandle, Props>(
  ({ sceneData, bgColor, onSceneChange, onBgColorChange }, ref) => {
  const apiRef = useRef<ExcalidrawImperativeAPI>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filesRef = useRef<Record<string, never> | null>(null);

    useImperativeHandle(ref, () => ({
      exportImage: async (bg: string) => {
        const api = apiRef.current;
        if (!api) throw new Error("Excalidraw not initialized");

        const elements = api.getSceneElements();
        const files = filesRef.current;

        if (elements.length === 0) {
          const canvas = document.createElement("canvas");
          canvas.width = 1920;
          canvas.height = 1080;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, 1920, 1080);
          return new Promise<Blob>((resolve) => canvas.toBlob(resolve!, "image/png"));
        }

        const blob = await excalidrawExportToBlob({
          elements: elements as never[],
          appState: {
            viewBackgroundColor: bg,
            exportBackground: true,
          },
          files,
        });

        const img = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1920, 1080);

        const scale = Math.min(1920 / img.width, 1080 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (1920 - w) / 2;
        const y = (1080 - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        return new Promise<Blob>((resolve) => canvas.toBlob(resolve!, "image/png"));
      },
      getSceneData: () => {
        const api = apiRef.current;
        if (!api) return "[]";
        const elements = api.getSceneElements();
        const files = filesRef.current;
        return JSON.stringify({ elements, files });
      },
    }));

    const handleChange = useCallback(
      (_elements: never[], _appState: never, files: Record<string, never> | null) => {
        if (files) filesRef.current = files;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const api = apiRef.current;
          if (!api) return;
          const elements = api.getSceneElements();
          onSceneChange(JSON.stringify({ elements, files: filesRef.current }));
        }, 1000);
      },
      [onSceneChange]
    );

    useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, []);

    useEffect(() => {
      const api = apiRef.current;
      if (!api) return;
      api.updateScene({ appState: { viewBackgroundColor: bgColor } });
    }, [bgColor]);

    const parsed = sceneData ? JSON.parse(sceneData) : null;
    const initialElements = parsed
      ? Array.isArray(parsed) ? parsed : parsed.elements || []
      : [];
    const initialFiles = parsed && !Array.isArray(parsed) && parsed.files ? parsed.files : undefined;

    return (
      <div className="relative h-full w-full">
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-gray-800/90 rounded px-2 py-1">
          <label className="text-gray-400 text-xs">BG</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => onBgColorChange(e.target.value)}
            className="w-6 h-6 cursor-pointer border-0 bg-transparent"
          />
        </div>
        <div className="h-full w-full">
          <Excalidraw
            excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
              (apiRef as React.MutableRefObject<ExcalidrawImperativeAPI | null>).current = api;
            }}
            initialData={{
              elements: initialElements,
              appState: { viewBackgroundColor: bgColor },
              ...(initialFiles ? { files: initialFiles } : {}),
            }}
            onChange={handleChange}
            theme="dark"
            gridModeEnabled={false}
            viewModeEnabled={false}
            zenModeEnabled={false}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: true,
                clearCanvas: true,
                export: false,
                loadScene: false,
                saveToActiveFile: false,
                toggleTheme: false,
              },
            }}
          />
        </div>
      </div>
    );
  }
);

CanvasEditor.displayName = "CanvasEditor";
export default CanvasEditor;
