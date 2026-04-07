import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecordings } from "../hooks/useRecordings";

export default function RecordingsList() {
  const { recordings, loading, remove } = useRecordings();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { update } = useRecordings();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  }

  const startEdit = (id: number, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const saveEdit = async (id: number) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      await update(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">All Recordings</h1>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + New Recording
        </button>
      </div>

      {recordings.length === 0 ? (
        <p className="text-gray-500 text-center py-16">
          No recordings yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {recordings.map((rec) => (
            <div
              key={rec.id}
              className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/recording/${rec.id}`)}
              >
                {editingId === rec.id ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(rec.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="bg-gray-700 text-white rounded px-3 py-1 w-full"
                  />
                ) : (
                  <>
                    <h3 className="text-white font-medium">{rec.title}</h3>
                    <p className="text-gray-500 text-sm">
                      {rec.screenshot_count} screenshot
                      {rec.screenshot_count !== 1 ? "s" : ""} &middot;{" "}
                      {new Date(rec.created_at).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                {editingId === rec.id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit(rec.id);
                    }}
                    className="text-green-400 hover:text-green-300 text-sm"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(rec.id, rec.title);
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm("Delete this recording?")) {
                      await remove(rec.id);
                    }
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
