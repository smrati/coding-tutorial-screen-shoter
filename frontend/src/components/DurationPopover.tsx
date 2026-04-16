import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showReset?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}

export default function DurationPopover({
  value,
  onChange,
  min = 0.5,
  max = 10,
  step = 0.5,
  showReset = false,
  onReset,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {children}
      </div>
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-600 p-3 z-50 w-44"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="text-gray-400 text-xs block mb-1.5">
            Duration (sec)
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-white text-sm font-medium">{value}s</span>
            {showReset && onReset && (
              <button
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
                className="text-gray-400 hover:text-white text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
