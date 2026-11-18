"use client";

import { useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { compressImage, formatBytes } from "@/lib/imageCompression";

type CompressedFileInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
>;

export default function CompressedFileInput({
  className,
  ...props
}: CompressedFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionToken = useRef(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setStatus(null);
      return;
    }

    const token = ++selectionToken.current;
    setBusy(true);
    setStatus(`Compressing ${formatBytes(file.size)}…`);

    const result = await compressImage(file);
    if (token !== selectionToken.current) return;

    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(result.file);
      inputRef.current.files = transfer.files;
    }

    setBusy(false);
    if (result.compressed) {
      const saving = Math.round(
        (1 - result.compressedSize / result.originalSize) * 100
      );
      setStatus(
        `${formatBytes(result.originalSize)} → ${formatBytes(
          result.compressedSize
        )} (−${saving}%)`
      );
    } else {
      setStatus(formatBytes(result.originalSize));
    }
  }

  return (
    <div className="space-y-1">
      <input
        {...props}
        ref={inputRef}
        type="file"
        onChange={handleChange}
        className={className}
      />
      {status && (
        <span
          className={`block text-[9px] ${
            busy ? "font-semibold text-amber-700" : "text-neutral-500"
          }`}
        >
          {status}
        </span>
      )}
    </div>
  );
}
