interface Props {
  title: string;
  editingSlideNumber: number | null;
  onCapture: () => void;
  onExport: () => void;
  onExportVideo: () => void;
  onCancelEdit: () => void;
  onToggleFullscreen: () => void;
  capturing: boolean;
  exportingVideo: boolean;
}

export default function EditorToolbar({
  title,
  editingSlideNumber,
  onCapture,
  onExport,
  onExportVideo,
  onCancelEdit,
  onToggleFullscreen,
  capturing,
  exportingVideo,
}: Props) {
  const isEditing = editingSlideNumber !== null;

  return (
    <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-white font-semibold truncate">{title}</h2>
        {isEditing && (
          <span className="shrink-0 bg-amber-700/80 text-amber-100 text-xs font-medium px-2.5 py-1 rounded-full">
            Editing Slide #{editingSlideNumber}
          </span>
        )}
      </div>
      <div className="flex gap-3 shrink-0">
        <button
          onClick={onCapture}
          disabled={capturing}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {capturing ? "Saving..." : isEditing ? "Save Edit" : "Screenshot"}
        </button>
        {isEditing && (
          <button
            onClick={onCancelEdit}
            className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onToggleFullscreen}
          className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          title="Fullscreen editor"
        >
          Fullscreen
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
