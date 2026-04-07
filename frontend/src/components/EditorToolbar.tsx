interface Props {
  title: string;
  onCapture: () => void;
  onExport: () => void;
  capturing: boolean;
}

export default function EditorToolbar({
  title,
  onCapture,
  onExport,
  capturing,
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
          Export All Screenshots
        </button>
      </div>
    </div>
  );
}
