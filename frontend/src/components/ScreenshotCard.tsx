import { screenshotImageUrl } from "../services/api";

interface Props {
  recordingId: number;
  screenshotId: number;
  slideNumber: number;
  onDelete: () => void;
}

export default function ScreenshotCard({
  recordingId,
  screenshotId,
  slideNumber,
  onDelete,
}: Props) {
  return (
    <div className="group relative bg-gray-700 rounded-lg overflow-hidden">
      <img
        src={screenshotImageUrl(recordingId, screenshotId)}
        alt={`Slide ${slideNumber}`}
        className="w-full object-contain"
      />
      <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
        {slideNumber}
      </div>
      <button
        onClick={onDelete}
        className="absolute top-1 right-1 bg-red-600/80 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
      >
        X
      </button>
    </div>
  );
}
