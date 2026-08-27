/** One row of the QC register, as returned by POST /api/analyze. */
export interface QcRow {
  srNo: number;
  fileName: string;
  drawing1: string;
  drawing2: string;
  status: QcStatus;
  error?: string | null;
}

export type QcStatus = "Matched" | "Unmatched" | "Duplicate";

export interface QcSummary {
  total: number;
  matched: number;
  unmatched: number;
  duplicate: number;
}

export interface AnalyzeResponse {
  reportToken: string;
  reportName: string;
  summary: QcSummary;
  rows: QcRow[];
}

/** The signed-in account, as returned by /api/auth/me and /api/auth/login. */
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  securityQuestion?: string | null;
}

// ---------- KBR Tagwise Delivery Report ----------

/** One expected drawing and whether a matching delivered file was found. */
export interface TagRow {
  srNo: number;
  drawingNo: string;
  description: string;
  status: "Delivered" | "Pending";
  deliveryDate: string;
  matchedFile: string;
}

export interface TagSummary {
  total: number;
  delivered: number;
  pending: number;
  doneFiles: number;
  /** Which sheet and column the backend auto-detected — worth showing, it guesses. */
  sheet: string;
  column: string;
}

export interface TagReportResponse {
  ok: boolean;
  reportToken: string;
  summary: TagSummary;
  rows: TagRow[];
}

// ---------- ConsList ----------

/** ConsList splits every platform's files into these two buckets. */
export type ConsCategory = "Internal" | "External";

/** One file that was added, as shown in the datewise log. */
export interface ConsLogEntry {
  date: string; // dd-MM-yyyy
  name: string; // original file name
  count: number; // rows appended (Excel) or pages appended (PDF)
  type: "Excel" | "PDF";
}

/** Totals for one platform+category pair. */
export interface ConsCategoryState {
  excelRev: number;
  pdfRev: number;
  excelRows: number;
  pdfPages: number;
  excelFiles: number;
  pdfFiles: number;
  hasExcel: boolean;
  hasPdf: boolean;
  log: ConsLogEntry[];
}

export interface ConsState {
  projects: string[];
  categories: ConsCategory[];
  data: Record<string, Record<string, ConsCategoryState>>;
}

/** Per-batch totals from POST /api/conslist/add. Partial failures come back in `errors`. */
export interface ConsAddResponse {
  ok: boolean;
  excelRows: number;
  pdfPages: number;
  excelFiles: number;
  pdfFiles: number;
  errors: string[];
}

// ---------- workspace layout ----------

/** Which tools each client workspace exposes. Add entries to grow the tool tab row. */
export interface Tool {
  id: ViewId;
  label: string;
}

export type ViewId = "qc" | "mto" | "conslist" | "tagreport" | "empty";

export type ClientName = "S2NERGY" | "QATAR" | "UAE" | "KBR";

export const CLIENTS: ClientName[] = ["S2NERGY", "QATAR", "UAE", "KBR"];

/**
 * Booklet and AutoCAD sync are deliberately absent: both drive Microsoft Office / AutoCAD
 * through Windows COM on the machine running the backend, so neither can follow this UI
 * onto a Linux host. They remain available in the C# app itself.
 */
export const TOOLS: Record<ClientName, Tool[]> = {
  S2NERGY: [
    { id: "qc", label: "QC Check" },
    { id: "mto", label: "MTO Check" },
    { id: "conslist", label: "ConsList" },
  ],
  QATAR: [],
  UAE: [],
  KBR: [{ id: "tagreport", label: "Tagwise Delivery" }],
};
