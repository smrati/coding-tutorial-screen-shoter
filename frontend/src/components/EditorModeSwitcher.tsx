interface Props {
  mode: "markdown" | "canvas";
  onModeChange: (mode: "markdown" | "canvas") => void;
}

export default function EditorModeSwitcher({ mode, onModeChange }: Props) {
  return (
    <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5">
      <button
        onClick={() => onModeChange("markdown")}
        className={`px-3 py-1 text-xs font-medium rounded-md transition ${
          mode === "markdown"
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Markdown
      </button>
      <button
        onClick={() => onModeChange("canvas")}
        className={`px-3 py-1 text-xs font-medium rounded-md transition ${
          mode === "canvas"
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Canvas
      </button>
    </div>
  );
}
