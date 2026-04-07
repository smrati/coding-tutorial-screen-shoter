import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecordings } from "../hooks/useRecordings";
import CreateRecordingModal from "./CreateRecordingModal";

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { create } = useRecordings();

  const handleCreate = async (title: string) => {
    const rec = await create(title);
    setShowModal(false);
    navigate(`/recording/${rec.id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gray-950 text-white px-4">
      <h1 className="text-5xl font-bold mb-4">CodeShot</h1>
      <p className="text-gray-400 text-lg mb-8 text-center max-w-md">
        Create coding tutorials by writing code and capturing screenshots as slides. Export them as a ZIP.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition"
      >
        Create New Recording
      </button>

      {showModal && (
        <CreateRecordingModal
          onSubmit={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
