"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { consAdd, consAddProject, consDeleteProject, consDownloadUrl, consState } from "@/lib/api";
import type { ConsCategoryState, ConsLogEntry, ConsState } from "@/lib/types";
import { DocIcon, PageIcon, Spinner } from "./icons";
import { Button, ErrorMsg, OkMsg, PageHead, Panel } from "./ui";

const EXCEL_EXT = [".xlsx", ".xls"];
const PDF_EXT = [".pdf"];

/** A note shown to the user — success and failure share one slot. */
type Note = { text: string; ok: boolean } | null;

export function ConsListView({ client }: { client: string }) {
  const [state, setState] = useState<ConsState | null>(null);
  const [project, setProject] = useState("");
  const [category, setCategory] = useState("");
  const [newProject, setNewProject] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [projNote, setProjNote] = useState<Note>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await consState();
      setState(next);
      // Keep the current selection only while it still exists — deleting a project must not
      // leave the dropdown pointing at something that is gone.
      setProject((p) => (p && next.projects.includes(p) ? p : ""));
    } catch (err) {
      setNote({ text: err instanceof Error ? err.message : "Could not load ConsList.", ok: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const current: ConsCategoryState | null = useMemo(() => {
    if (!state || !project || !category) return null;
    return state.data?.[project]?.[category] ?? null;
  }, [state, project, category]);

  async function upload(files: File[]) {
    if (!project) return setNote({ text: "Select a project first.", ok: false });
    if (!category) return setNote({ text: "Select a type (Internal / External) first.", ok: false });
    if (files.length === 0) return;

    setBusy(true);
    setNote({ text: `Adding ${files.length} file(s)…`, ok: true });
    try {
      const r = await consAdd(project, category, files);
      const summary = `Added: ${r.excelFiles} Excel (${r.excelRows} rows), ${r.pdfFiles} PDF (${r.pdfPages} pages).`;
      // A batch can partly succeed — report what went in, then what did not.
      const bad = r.errors?.length > 0;
      setNote({ text: bad ? `${summary} — Skipped: ${r.errors.join("; ")}` : summary, ok: !bad });
      await refresh();
    } catch (err) {
      setNote({ text: err instanceof Error ? err.message : "Add failed.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  function download(type: "excel" | "pdf") {
    if (!project) return setNote({ text: "Select a project first.", ok: false });
    if (!category) return setNote({ text: "Select a type (Internal / External) first.", ok: false });
    if (type === "excel" && !current?.hasExcel)
      return setNote({ text: "No Excel added yet for this platform.", ok: false });
    if (type === "pdf" && !current?.hasPdf)
      return setNote({ text: "No PDF added yet for this platform.", ok: false });

    window.location.href = consDownloadUrl(project, category, type);
    // The revision counter is bumped server-side by the download itself, so the Rev on screen
    // is stale the moment the file leaves. Re-read once the navigation has had time to fire.
    setTimeout(() => void refresh(), 1500);
  }

  async function addProject() {
    const name = newProject.trim();
    if (!name) return setProjNote({ text: "Enter a project number.", ok: false });
    try {
      await consAddProject(name);
      setNewProject("");
      await refresh();
      setProject(name);
      setProjNote({ text: `Project "${name}" added.`, ok: true });
    } catch (err) {
      setProjNote({ text: err instanceof Error ? err.message : "Could not add project.", ok: false });
    }
  }

  async function removeProject() {
    if (!project) return setNote({ text: "Select a project to delete.", ok: false });
    const confirmed = window.confirm(
      `Delete project "${project}"?\n\nThis permanently removes it and its consolidated Excel/PDF (Internal and External).`,
    );
    if (!confirmed) return;
    try {
      await consDeleteProject(project);
      await refresh();
      setNote({ text: `Project "${project}" deleted.`, ok: true });
    } catch (err) {
      setNote({ text: err instanceof Error ? err.message : "Could not delete project.", ok: false });
    }
  }

  return (
    <>
      <PageHead title="ConsList" client={client}>
        Add Excel &amp; PDF daily per platform — each is merged, datewise, into one running
        consolidated file to share with the client (Rev 1, 2, 3…N).
      </PageHead>

      <Panel className="mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Project">
            <div className="flex items-center gap-2.5">
              <Select
                value={project}
                onChange={setProject}
                placeholder="Select project no"
                options={state?.projects ?? []}
              />
              <button
                type="button"
                onClick={() => void removeProject()}
                className="rounded-[10px] border border-[#e6a3a8] bg-unmatch-bg px-[18px] py-[11px] text-sm font-bold
                  text-unmatch-fg transition hover:brightness-95"
              >
                Delete
              </button>
            </div>
          </Field>

          <Field label="Type">
            <Select
              value={category}
              onChange={setCategory}
              placeholder="Select type"
              options={state?.categories ?? []}
            />
          </Field>

          <Field label="Add a new project">
            <div className="flex items-center gap-2.5">
              <input
                value={newProject}
                onChange={(e) => {
                  setNewProject(e.target.value);
                  setProjNote(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addProject();
                }}
                placeholder="e.g. RP7N"
                className="w-[210px] rounded-[10px] border border-line bg-panel px-3.5 py-[11px] text-[14.5px]
                  text-ink outline-none transition placeholder:text-faint focus:border-accent"
              />
              <Button onClick={() => void addProject()} className="px-[22px] py-[11px] text-sm">
                Add project
              </Button>
            </div>
          </Field>
        </div>

        {projNote && (
          <p className={`mt-3 text-[13px] ${projNote.ok ? "text-match-fg" : "text-unmatch-fg"}`}>{projNote.text}</p>
        )}
      </Panel>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <DropCard
          kind="TYPICAL SUPPORTS"
          title="Add Excel"
          hint="Drop .xlsx / .xls here, or click to choose. Rows are appended datewise into the consolidated Excel."
          accept={EXCEL_EXT}
          busy={busy}
          onFiles={upload}
          icon={<DocIcon className="h-7 w-7" />}
        />
        <DropCard
          kind="UNIQUE SUPPORTS"
          title="Add PDF"
          hint="Drop .pdf here, or click to choose. Pages are appended into the consolidated PDF."
          accept={PDF_EXT}
          busy={busy}
          onFiles={upload}
          icon={<PageIcon className="h-7 w-7" />}
        />
      </div>

      {current && <ConsCards d={current} />}

      <div className="mb-5 flex flex-wrap gap-3.5">
        <Button variant="secondary" onClick={() => download("excel")}>
          Download consolidated Excel
        </Button>
        <Button onClick={() => download("pdf")}>Download consolidated PDF</Button>
      </div>

      {note && (note.ok ? <OkMsg>{note.text}</OkMsg> : <ErrorMsg>{note.text}</ErrorMsg>)}

      <Panel className="mt-5 overflow-hidden p-0">
        <ConsLog log={current?.log ?? []} />
      </Panel>
    </>
  );
}

// ---------- pieces ----------

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.07em] text-muted">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[210px] cursor-pointer rounded-[10px] border border-line bg-panel px-3.5 py-[11px]
        text-[14.5px] text-ink outline-none transition focus:border-accent"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** One of the two upload targets. Non-matching files are dropped before they reach the server. */
function DropCard({
  kind,
  title,
  hint,
  accept,
  busy,
  onFiles,
  icon,
}: {
  kind: string;
  title: string;
  hint: string;
  accept: string[];
  busy: boolean;
  onFiles: (files: File[]) => void;
  icon: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const keep = (files: FileList | null) =>
    [...(files ?? [])].filter((f) => accept.some((a) => f.name.toLowerCase().endsWith(a)));

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
        onFiles(keep(e.dataTransfer.files));
      }}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9
        text-center transition ${
          dragging
            ? "border-accent bg-[#f0f0fe]"
            : "border-[#cdd5e2] bg-[#f7f9fc] hover:border-accent hover:bg-[#f0f0fe]"
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept.join(",")}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          onFiles(keep(e.target.files));
          // Reset so re-picking the same file still fires onChange.
          e.target.value = "";
        }}
      />
      <span className="text-accent">{busy ? <Spinner /> : icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-[.08em] text-accent">{kind}</span>
      <span className="text-[17px] font-bold text-ink">{title}</span>
      <span className="max-w-[420px] text-[13px] text-muted">{hint}</span>
    </label>
  );
}

function ConsCards({ d }: { d: ConsCategoryState }) {
  const cards = [
    { n: d.excelFiles, cap: "Excel files added" },
    { n: d.excelRows, cap: "Rows · typical supports" },
    { n: d.pdfFiles, cap: "PDF files added" },
    { n: d.pdfPages, cap: "Pages · unique supports" },
    { n: `Rev ${d.excelRev}`, cap: "Excel revisions shared" },
    { n: `Rev ${d.pdfRev}`, cap: "PDF revisions shared" },
  ];
  return (
    <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-6">
      {cards.map(({ n, cap }) => (
        <div
          key={cap}
          className="rounded-2xl border border-line bg-panel px-4 py-[15px] shadow-[0_4px_16px_rgba(16,24,40,.05)]"
        >
          <div className="text-[26px] font-extrabold leading-none tracking-[-.02em] text-ink">{n}</div>
          <div className="mt-1.5 text-[12px] text-muted">{cap}</div>
        </div>
      ))}
    </section>
  );
}

/**
 * The datewise add-log. Entries arrive already sorted by date; the date is printed once as a
 * banner above that day's files, mirroring how the consolidated Excel itself is laid out.
 */
function ConsLog({ log }: { log: ConsLogEntry[] }) {
  if (log.length === 0) {
    return <p className="px-6 py-12 text-center text-[14.5px] text-faint">No files added yet for this platform.</p>;
  }

  const rows: ReactNode[] = [];
  let lastDate: string | null = null;

  log.forEach((e, i) => {
    if (e.date !== lastDate) {
      rows.push(
        <tr key={`d-${i}`} className="bg-[#eef2fb]">
          <td colSpan={3} className="px-5 py-2 text-[13px] font-bold text-ink">
            {e.date}
          </td>
        </tr>,
        <tr key={`h-${i}`} className="bg-[#f7f9fc] text-[11px] uppercase tracking-[.06em] text-muted">
          <td className="px-5 py-1.5">Type</td>
          <td className="px-5 py-1.5">File</td>
          <td className="px-5 py-1.5">Rows / Pages</td>
        </tr>,
      );
      lastDate = e.date;
    }
    rows.push(
      <tr key={`r-${i}`} className="border-t border-line">
        <td className="px-5 py-2.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              e.type === "Excel" ? "bg-match-bg text-match-fg" : "bg-[#e6ebfe] text-accent"
            }`}
          >
            {e.type}
          </span>
        </td>
        <td className="px-5 py-2.5 text-[13.5px] text-ink">{e.name}</td>
        <td className="px-5 py-2.5 text-[13.5px] text-muted">{e.count}</td>
      </tr>,
    );
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
