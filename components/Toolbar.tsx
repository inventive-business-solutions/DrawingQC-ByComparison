"use client";

import { CLIENTS, TOOLS, type ClientName, type ViewId } from "@/lib/types";

interface Props {
  client: ClientName;
  view: ViewId;
  onClient: (c: ClientName) => void;
  onView: (v: ViewId) => void;
}

export function Toolbar({ client, view, onClient, onView }: Props) {
  const tools = TOOLS[client];

  return (
    <div className="mb-[26px] flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {CLIENTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onClient(c)}
            className={`rounded-[11px] px-[22px] py-[11px] text-sm font-bold tracking-[.01em] transition ${
              c === client
                ? "grad border border-transparent text-white shadow-[0_8px_18px_rgba(99,60,220,.3)]"
                : "border border-line bg-panel text-muted shadow-[0_2px_6px_rgba(16,24,40,.05)] hover:border-accent hover:text-ink"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex min-h-[34px] flex-wrap items-center gap-2.5">
        {tools.length === 0 ? (
          <span className="text-[13px] italic text-faint">No tools yet for {client}</span>
        ) : (
          tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onView(t.id)}
              className={`rounded-full border px-[17px] py-2 text-[13px] font-semibold transition ${
                t.id === view
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-transparent text-muted hover:border-accent hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
