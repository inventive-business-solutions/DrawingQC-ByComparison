"use client";

import { useMemo, useState } from "react";
import { reportUrl, tagReport } from "@/lib/api";
import type { TagReportResponse, TagRow } from "@/lib/types";
import { FilePicker } from "./FilePicker";
import { Spinner } from "./icons";
import { Button, ErrorMsg, PageHead, Panel } from "./ui";

type Filter = "all" | "Delivered" | "Pending";

const FILTERS: Filter[] = ["all", "Delivered", "Pending"];

export function TagReportView({ client }: { client: string }) {
  const [excel, setExcel] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TagReportResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const visible: TagRow[] = useMemo(() => {
    if (!result) return [];
    return filter === "all" ? result.rows : result.rows.filter((r) => r.status === filter);
  }, [result, filter]);

  async function run() {
    if (!excel || !zip) return;
    setError(null);
    setRunning(true);
    try {
      setResult(await tagReport(excel, zip));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <PageHead title="Tagwise Delivery" client={client}>
        Upload the client drawing list and a .zip of delivered files — each expected drawing is
        marked Delivered or Pending.
      </PageHead>

      {result && <TagCards summary={result.summary} />}

      <Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <FilePicker
            label="Client Excel"
            hint="The expected drawing list (.xlsx)."
            accept={[".xlsx", ".xls"]}
            file={excel}
            onFile={setExcel}
          />
          <FilePicker
            label="Delivered files"
            hint="A .zip of the delivered .dwg / .pdf files."
            accept={[".zip"]}
            file={zip}
            onFile={setZip}
          />
        </div>

        <div className="mt-[18px] flex flex-wrap items-center gap-4">
          <Button onClick={() => void run()} disabled={!excel || !zip || running}>
            {running ? (
              <>
                <Spinner />
                Building report…
              </>
            ) : (
              "Build report"
            )}
          </Button>
          {result && (
            <Button variant="secondary" onClick={() => (window.location.href = reportUrl(result.reportToken))}>
              Download Excel report
            </Button>
          )}
        </div>

        {error && <ErrorMsg>{error}</ErrorMsg>}
      </Panel>

      {result && (
        <Panel className="mt-5">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold">Results</h2>
            {/* The backend guesses which sheet and column hold the drawing numbers — showing
                what it picked is the only way a wrong guess is noticeable. */}
            <span className="text-[12.5px] text-muted">
              Sheet <b className="text-ink">{result.summary.sheet || "—"}</b> · column{" "}
              <b className="text-ink">{result.summary.column || "—"}</b>
            </span>
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
            <table className="w-full min-w-[760px] border-collapse overflow-hidden rounded-[10px] border border-line text-[13.5px]">
              <thead>
                <tr>
                  {["Sr.No", "Drawing No.", "Description", "Status", "Delivery date", "Matched file"].map((h) => (
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
                  <tr
                    key={r.srNo}
                    className={r.status === "Delivered" ? "bg-match-bg text-match-fg" : "bg-unmatch-bg text-unmatch-fg"}
                  >
                    <td className="border-t border-line px-3.5 py-2.5">{r.srNo}</td>
                    <td className="border-t border-line px-3.5 py-2.5">{r.drawingNo}</td>
                    <td className="border-t border-line px-3.5 py-2.5">{r.description}</td>
                    <td className="border-t border-line px-3.5 py-2.5 font-bold">{r.status}</td>
                    <td className="border-t border-line px-3.5 py-2.5">{r.deliveryDate || "—"}</td>
                    <td className="border-t border-line px-3.5 py-2.5">{r.matchedFile || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}

function TagCards({ summary }: { summary: TagReportResponse["summary"] }) {
  const cards = [
    { n: summary.total, cap: "Expected drawings", tint: "text-ink" },
    { n: summary.delivered, cap: "Delivered", tint: "text-match-fg" },
    { n: summary.pending, cap: "Pending", tint: "text-unmatch-fg" },
    { n: summary.doneFiles, cap: "Files in zip", tint: "text-ink" },
  ];
  return (
    <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ n, cap, tint }) => (
        <div
          key={cap}
          className="rounded-2xl border border-line bg-panel px-5 py-[18px] shadow-[0_4px_16px_rgba(16,24,40,.05)]"
        >
          <div className={`text-[32px] font-extrabold leading-none tracking-[-.02em] ${tint}`}>{n}</div>
          <div className="mt-2 text-[13px] text-muted">{cap}</div>
        </div>
      ))}
    </section>
  );
}
