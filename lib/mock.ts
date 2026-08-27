import type {
  AnalyzeResponse,
  ConsAddResponse,
  ConsCategoryState,
  ConsState,
  TagReportResponse,
  User,
} from "./types";

/**
 * Standalone mode: canned answers standing in for the C# backend, so the UI runs on its own.
 *
 * This is the only mode that works today. The C# project (DrawingQC.Web) has been deleted from
 * the repo and lives only in git history, so NEXT_PUBLIC_USE_BACKEND=1 has nothing to talk to
 * until a replacement backend exists — the flag and the commented-out fetch helpers in
 * lib/api.ts are kept as the seam to wire one up.
 *
 * Nothing here does real work: no PDF is read, no Excel is written, no drawing is compared.
 * Every count and status below is invented. It exists so each screen can be reached, styled
 * and clicked through without a backend. Treat all of it as scenery.
 */
export const MOCK = process.env.NEXT_PUBLIC_USE_BACKEND !== "1";

/** Latency, so loading states are actually visible rather than flashing past. */
const delay = <T>(value: T, ms = 450): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

// ---------- auth ----------

const SESSION_KEY = "drawingqc.mock.user";

export const mockUser: User = {
  id: "mock-1",
  username: "demo",
  email: "demo@example.com",
  name: "Demo User",
  role: "Admin",
  securityQuestion: null,
};

/**
 * The signed-in user is kept in web storage rather than assumed, so the real flow still runs:
 * first load shows the login screen, signing in sticks across reloads, signing out returns to
 * the login screen. localStorage when "keep me signed in" is ticked, sessionStorage otherwise.
 *
 * Storage is wrapped because it throws outright in some privacy modes — a dead sign-in is a
 * better outcome there than a blank page.
 */
function readSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeSession(user: User, remember: boolean): void {
  try {
    const store = remember ? window.localStorage : window.sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // Non-fatal: the sign-in still succeeds for this page view, it just will not survive a reload.
  }
}

function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** Null means "not signed in" — api.ts turns that into the UnauthorizedError the UI expects. */
export function mockMe(): Promise<{ user: User } | null> {
  const user = readSession();
  return delay(user ? { user } : null, 250);
}

/**
 * Any non-empty credentials are accepted; there are no accounts to check against. The name is
 * derived from what was typed so the sidebar shows something recognisable instead of "Demo User".
 */
export function mockLogin(loginName: string, remember: boolean): Promise<{ user: User }> {
  const handle = loginName.trim();
  const bare = handle.includes("@") ? handle.split("@")[0] : handle;
  const name = bare
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");

  const user: User = {
    ...mockUser,
    username: bare || mockUser.username,
    email: handle.includes("@") ? handle : `${bare}@example.com`,
    name: name || mockUser.name,
  };
  writeSession(user, remember);
  return delay({ user }, 600);
}

export function mockLogout(): Promise<{ ok: boolean }> {
  clearSession();
  return delay({ ok: true }, 200);
}

// ---------- QC Check ----------

/**
 * A spread deliberately covering all three statuses plus an error row, since those are the
 * branches ResultsTable renders differently.
 */
const qcRows: AnalyzeResponse["rows"] = [
  { srNo: 1, fileName: "PID-1001-Rev-A.pdf", drawing1: "PID-1001", drawing2: "PID-1001", status: "Matched" },
  { srNo: 2, fileName: "PID-1002-Rev-B.pdf", drawing1: "PID-1002", drawing2: "PID-1002", status: "Matched" },
  { srNo: 3, fileName: "PID-1003-Rev-A.pdf", drawing1: "PID-1003", drawing2: "PID-1013", status: "Unmatched" },
  { srNo: 4, fileName: "ISO-2201-Rev-C.pdf", drawing1: "ISO-2201", drawing2: "ISO-2201", status: "Matched" },
  { srNo: 5, fileName: "ISO-2202-Rev-A.pdf", drawing1: "ISO-2202", drawing2: "ISO-2202", status: "Duplicate" },
  { srNo: 6, fileName: "ISO-2203-Rev-A.pdf", drawing1: "ISO-2203", drawing2: "", status: "Unmatched" },
  { srNo: 7, fileName: "GA-3301-Rev-D.pdf", drawing1: "GA-3301", drawing2: "GA-3301", status: "Matched" },
  { srNo: 8, fileName: "GA-3302-Rev-A.pdf", drawing1: "GA-3302", drawing2: "GA-3302", status: "Matched" },
  {
    srNo: 9,
    fileName: "GA-3303-corrupt.pdf",
    drawing1: "",
    drawing2: "",
    status: "Unmatched",
    error: "Title block not found on page 1.",
  },
  { srNo: 10, fileName: "LAY-4401-Rev-A.pdf", drawing1: "LAY-4401", drawing2: "LAY-4401", status: "Matched" },
  { srNo: 11, fileName: "LAY-4402-Rev-B.pdf", drawing1: "LAY-4402", drawing2: "LAY-4402", status: "Duplicate" },
  { srNo: 12, fileName: "LAY-4403-Rev-A.pdf", drawing1: "LAY-4403", drawing2: "LAY-4409", status: "Unmatched" },
];

export function mockAnalyze(file: File): Promise<AnalyzeResponse> {
  const count = (s: AnalyzeResponse["rows"][number]["status"]) => qcRows.filter((r) => r.status === s).length;
  return delay(
    {
      reportToken: "mock-report",
      reportName: `${file.name.replace(/\.[^.]+$/, "")}-QC-Register.xlsx`,
      summary: {
        total: qcRows.length,
        matched: count("Matched"),
        unmatched: count("Unmatched"),
        duplicate: count("Duplicate"),
      },
      rows: qcRows,
    },
    900,
  );
}

// ---------- KBR Tagwise Delivery Report ----------

const tagRows: TagReportResponse["rows"] = [
  { srNo: 1, drawingNo: "KBR-PID-0001", description: "Process Flow Diagram - Unit 100", status: "Delivered", deliveryDate: "12-08-2026", matchedFile: "KBR-PID-0001.dwg" },
  { srNo: 2, drawingNo: "KBR-PID-0002", description: "Process Flow Diagram - Unit 200", status: "Delivered", deliveryDate: "12-08-2026", matchedFile: "KBR-PID-0002.dwg" },
  { srNo: 3, drawingNo: "KBR-PID-0003", description: "Utility Distribution Schematic", status: "Pending", deliveryDate: "", matchedFile: "" },
  { srNo: 4, drawingNo: "KBR-ISO-0110", description: "Isometric - Line 110-CS-4in", status: "Delivered", deliveryDate: "19-08-2026", matchedFile: "KBR-ISO-0110.pdf" },
  { srNo: 5, drawingNo: "KBR-ISO-0111", description: "Isometric - Line 111-CS-6in", status: "Delivered", deliveryDate: "19-08-2026", matchedFile: "KBR-ISO-0111.pdf" },
  { srNo: 6, drawingNo: "KBR-ISO-0112", description: "Isometric - Line 112-SS-2in", status: "Pending", deliveryDate: "", matchedFile: "" },
  { srNo: 7, drawingNo: "KBR-GA-0450", description: "General Arrangement - Pump House", status: "Delivered", deliveryDate: "25-08-2026", matchedFile: "KBR-GA-0450.dwg" },
  { srNo: 8, drawingNo: "KBR-GA-0451", description: "General Arrangement - Tank Farm", status: "Pending", deliveryDate: "", matchedFile: "" },
];

export function mockTagReport(): Promise<TagReportResponse> {
  const delivered = tagRows.filter((r) => r.status === "Delivered").length;
  return delay(
    {
      ok: true,
      reportToken: "mock-tagreport",
      summary: {
        total: tagRows.length,
        delivered,
        pending: tagRows.length - delivered,
        doneFiles: delivered,
        sheet: "Drawing Register",
        column: "C",
      },
      rows: tagRows,
    },
    900,
  );
}

// ---------- ConsList ----------

const category = (over: Partial<ConsCategoryState> = {}): ConsCategoryState => ({
  excelRev: 0,
  pdfRev: 0,
  excelRows: 0,
  pdfPages: 0,
  excelFiles: 0,
  pdfFiles: 0,
  hasExcel: false,
  hasPdf: false,
  log: [],
  ...over,
});

/**
 * Module-level so additions made during a session stick until reload — enough for the
 * add / refresh cycle to feel real while clicking through.
 */
const consState: ConsState = {
  projects: ["Demo Project A", "Demo Project B"],
  categories: ["Internal", "External"],
  data: {
    "Demo Project A": {
      Internal: category({
        excelRev: 3,
        pdfRev: 2,
        excelRows: 148,
        pdfPages: 92,
        excelFiles: 5,
        pdfFiles: 4,
        hasExcel: true,
        hasPdf: true,
        log: [
          { date: "05-08-2026", name: "batch-01.xlsx", count: 40, type: "Excel" },
          { date: "12-08-2026", name: "batch-02.xlsx", count: 62, type: "Excel" },
          { date: "12-08-2026", name: "drawings-set-a.pdf", count: 48, type: "PDF" },
          { date: "20-08-2026", name: "batch-03.xlsx", count: 46, type: "Excel" },
          { date: "20-08-2026", name: "drawings-set-b.pdf", count: 44, type: "PDF" },
        ],
      }),
      External: category({
        excelRev: 1,
        pdfRev: 1,
        excelRows: 36,
        pdfPages: 22,
        excelFiles: 2,
        pdfFiles: 1,
        hasExcel: true,
        hasPdf: true,
        log: [
          { date: "14-08-2026", name: "client-issue-01.xlsx", count: 36, type: "Excel" },
          { date: "14-08-2026", name: "client-issue-01.pdf", count: 22, type: "PDF" },
        ],
      }),
    },
    "Demo Project B": { Internal: category(), External: category() },
  },
};

export function mockConsState(): Promise<ConsState> {
  // Cloned so callers cannot mutate the fixture through the object they get back.
  return delay(structuredClone(consState));
}

export function mockConsAddProject(name: string): Promise<{ ok: boolean }> {
  if (!consState.projects.includes(name)) {
    consState.projects.push(name);
    consState.data[name] = { Internal: category(), External: category() };
  }
  return delay({ ok: true });
}

export function mockConsDeleteProject(name: string): Promise<{ ok: boolean }> {
  consState.projects = consState.projects.filter((p) => p !== name);
  delete consState.data[name];
  return delay({ ok: true });
}

export function mockConsAdd(platform: string, cat: string, files: File[]): Promise<ConsAddResponse> {
  const excel = files.filter((f) => /\.xlsx?$/i.test(f.name));
  const pdf = files.filter((f) => /\.pdf$/i.test(f.name));
  // Row and page counts are invented — no file is parsed. Kept proportional to the file count
  // so the totals at least move in a believable direction as you add more.
  const perExcel = 25;
  const perPdf = 12;
  const excelRows = excel.length * perExcel;
  const pdfPages = pdf.length * perPdf;

  const target = consState.data[platform]?.[cat];
  if (target) {
    const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
    if (excel.length) {
      target.excelRev += 1;
      target.excelRows += excelRows;
      target.excelFiles += excel.length;
      target.hasExcel = true;
      for (const f of excel) target.log.push({ date: today, name: f.name, count: perExcel, type: "Excel" });
    }
    if (pdf.length) {
      target.pdfRev += 1;
      target.pdfPages += pdfPages;
      target.pdfFiles += pdf.length;
      target.hasPdf = true;
      for (const f of pdf) target.log.push({ date: today, name: f.name, count: perPdf, type: "PDF" });
    }
  }

  const skipped = files.filter((f) => !excel.includes(f) && !pdf.includes(f));
  return delay(
    {
      ok: true,
      excelRows,
      pdfPages,
      excelFiles: excel.length,
      pdfFiles: pdf.length,
      errors: skipped.map((f) => `${f.name}: not an Excel or PDF file.`),
    },
    900,
  );
}

/**
 * Downloads are the one thing this cannot fake. The UI hands these URLs to the browser to
 * navigate to, and with no backend nothing is listening to serve the bytes. Returning "#"
 * keeps the click inert instead of sending the tab to a dead route.
 */
export function mockDownloadUrl(): string {
  return "#";
}
