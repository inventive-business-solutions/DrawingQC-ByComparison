"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "./icons";

export function Dropzone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={`group flex cursor-pointer flex-row items-center justify-center gap-4 rounded-[10px] border-2 border-dashed px-6 py-[18px] transition ${
        dragging ? "border-accent bg-[#f0f0fe]" : "border-[#cdd5e2] bg-[#f7f9fc] hover:border-accent hover:bg-[#f0f0fe]"
      }`}
    >
      <span
        className={`grad grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_18px_rgba(99,60,220,.32)] transition group-hover:scale-105 ${
          dragging ? "scale-105" : ""
        }`}
      >
        <UploadIcon className="h-[21px] w-[21px]" />
      </span>

      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          // Reset so picking the same file twice still fires onChange.
          e.target.value = "";
        }}
      />

      <span className="text-left">
        <span className="block text-[15px] text-ink">
          <strong className="font-bold text-accent">Drop a .zip here</strong> or click to choose
        </span>
        <small className="mt-0.5 block text-xs text-faint">Only .zip archives of PDF drawings are supported.</small>
      </span>
    </label>
  );
}
