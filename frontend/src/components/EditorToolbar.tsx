interface Props {
  title: string;
  onCapture: () => void;
  onExport: () => void;
  onExportVideo: () => void;
  capturing: boolean;
  exportingVideo: boolean;
}

export default function EditorToolbar({
  title,
  onCapture,
  onExport,
  onExportVideo,
  capturing,
  exportingVideo,
}: Props) {
  return (
    <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
      <h2 className="text-white font-semibold truncate mr-4">{title}</h2>
      <div className="flex gap-3 shrink-0">
        <button
          onClick={onCapture}
          disabled={capturing}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {capturing ? "Capturing..." : "Screenshot"}
        </button>
        <button
          onClick={onExport}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Export ZIP
        </button>
        <button
          onClick={onExportVideo}
          disabled={exportingVideo}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {exportingVideo ? "Rendering..." : "Export MP4"}
        </button>
      </div>
    </div>
  );
}
