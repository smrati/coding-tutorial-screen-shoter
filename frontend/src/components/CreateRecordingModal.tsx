import { useState } from "react";

interface Props {
  onSubmit: (title: string) => void;
  onClose: () => void;
}

export default function CreateRecordingModal({ onSubmit, onClose }: Props) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl"
      >
        <h2 className="text-xl font-semibold text-white mb-4">
          New Recording
        </h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter recording title..."
          autoFocus
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
