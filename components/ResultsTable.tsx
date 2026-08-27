"use client";

import { useMemo, useState } from "react";
import { reportUrl } from "@/lib/api";
import type { QcRow, QcStatus } from "@/lib/types";
import { Button, Panel } from "./ui";

const FILTERS: Array<"all" | QcStatus> = ["all", "Matched", "Unmatched", "Duplicate"];

const ROW_TINT: Record<QcStatus, string> = {
  Matched: "bg-match-bg text-match-fg",
  Unmatched: "bg-unmatch-bg text-unmatch-fg",
  Duplicate: "bg-dup-bg text-dup-fg",
};

interface Props {
  rows: QcRow[];
  reportToken: string;
}

export function ResultsTable({ rows, reportToken }: Props) {
  const [filter, setFilter] = useState<"all" | QcStatus>("all");

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  return (
    <Panel className="mt-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold">Results</h2>
        <Button variant="secondary" onClick={() => (window.location.href = reportUrl(reportToken))}>
          Download Excel report
        </Button>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-[15px] py-[7px] text-[13px] font-medium transition ${
              f === filter
                ? "border-ink bg-ink text-white"
                : "border-line bg-[#f1f4f9] text-muted hover:border-accent hover:text-ink"
            }`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse overflow-hidden rounded-[10px] border border-line text-[13.5px]">
          <thead>
            <tr>
              {["Sr.No", "Support PDF", "1st drawing name", "2nd drawing name", "Status"].map((h) => (
                <th
                  key={h}
                  className="border-b border-line bg-[#f4f6fa] px-3.5 py-[11px] text-left text-xs font-semibold uppercase tracking-[.03em] text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.srNo} className={ROW_TINT[r.status]}>
                <td className="border-t border-line px-3.5 py-2.5">{r.srNo}</td>
                <td className="border-t border-line px-3.5 py-2.5">{r.fileName}</td>
                <td className="border-t border-line px-3.5 py-2.5">{r.drawing1}</td>
                <td className="border-t border-line px-3.5 py-2.5">{r.drawing2}</td>
                <td className="border-t border-line px-3.5 py-2.5 font-bold">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
