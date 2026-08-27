"use client";

import { useState } from "react";

interface Props {
  label: string;
  hint: string;
  /** Lower-case extensions, e.g. [".xlsx", ".zip"]. Anything else is rejected on drop. */
  accept: string[];
  file: File | null;
  onFile: (f: File) => void;
}

/** A single labelled file slot — click or drop one file. */
export function FilePicker({ label, hint, accept, file, onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState(false);

  function take(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    const ok = accept.some((a) => f.name.toLowerCase().endsWith(a));
    setRejected(!ok);
    if (ok) onFile(f);
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col gap-1 rounded-[10px] border-2 border-dashed px-5 py-4 transition ${
        dragging ? "border-accent bg-[#f0f0fe]" : "border-[#cdd5e2] bg-[#f7f9fc] hover:border-accent hover:bg-[#f0f0fe]"
      }`}
    >
      <input
        type="file"
        accept={accept.join(",")}
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          // Reset so re-picking the same file still fires onChange.
          e.target.value = "";
        }}
      />
      <span className="text-[11px] font-bold uppercase tracking-[.07em] text-accent">{label}</span>
      <span className="truncate text-[14.5px] font-semibold text-ink">{file ? file.name : "Choose or drop a file"}</span>
      <span className={`text-[12.5px] ${rejected ? "text-unmatch-fg" : "text-muted"}`}>
        {rejected ? `Only ${accept.join(" / ")} accepted.` : hint}
      </span>
    </label>
  );
}
