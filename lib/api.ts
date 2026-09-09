import type { AnalyzeResponse, ConsAddResponse, ConsState, TagReportResponse, User } from "./types";

/**
 * The UI's data layer — connected to the C# backend (DrawingQC.Web).
 *
 * Every call goes to same-origin /api/*, which next.config.ts proxies to the backend (set via the
 * DRAWINGQC_API env var). Same-origin is load-bearing: the backend's session cookie is HttpOnly,
 * so it only rides along while the browser believes these are same-origin requests.
 *
 * Failures come back either as ASP.NET ProblemDetails ({ detail }) or as our own ({ error }), so
 * unwrap() handles both shapes; a 401 becomes UnauthorizedError so the UI shows the login screen.
 */

/**
 * Thrown when there is no session. The UI treats this as "show the login screen" rather than as
 * an error to display, so it must stay distinguishable from a genuine failure.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in.");
    this.name = "UnauthorizedError";
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new UnauthorizedError();
  const data = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok) throw new Error(data.detail || data.error || "Request failed.");
  return data as T;
}

async function get<T>(url: string): Promise<T> {
  return unwrap<T>(await fetch(url));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function postForm<T>(url: string, fd: FormData): Promise<T> {
  return unwrap<T>(await fetch(url, { method: "POST", body: fd }));
}

// ---------- auth ----------

export function me(): Promise<{ user: User }> {
  return get<{ user: User }>("/api/auth/me");
}

export function login(loginName: string, password: string, remember: boolean): Promise<{ user: User }> {
  return postJson<{ user: User }>("/api/auth/login", { login: loginName, password, remember }).catch((err) => {
    if (err instanceof UnauthorizedError) throw new Error("Invalid username or password.");
    throw err;
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>("/api/auth/logout", {});
}

// ---------- QC Check ----------

export function analyze(file: File): Promise<AnalyzeResponse> {
  const fd = new FormData();
  fd.append("file", file);
  return postForm<AnalyzeResponse>("/api/analyze", fd);
}

export function reportUrl(token: string): string {
  return `/api/report/${token}`;
}

// ---------- KBR Tagwise Delivery Report ----------

export function tagReport(excel: File, zip: File): Promise<TagReportResponse> {
  const fd = new FormData();
  fd.append("excelFile", excel);
  fd.append("zipFile", zip);
  return postForm<TagReportResponse>("/api/kbr/tagreport", fd);
}

// ---------- ConsList ----------

export function consState(): Promise<ConsState> {
  return get<ConsState>("/api/conslist/state");
}

export function consAddProject(name: string): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>("/api/conslist/project", { name });
}

export function consDeleteProject(name: string): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>("/api/conslist/project/delete", { name });
}

export function consAdd(platform: string, category: string, files: File[]): Promise<ConsAddResponse> {
  const fd = new FormData();
  fd.append("platform", platform);
  fd.append("category", category);
  for (const f of files) fd.append("files", f, f.name);
  return postForm<ConsAddResponse>("/api/conslist/add", fd);
}

export function consDownloadUrl(platform: string, category: string, type: "excel" | "pdf"): string {
  // The backend's download endpoint takes a scope (Internal | External | Combined); the UI's
  // category maps directly onto it. Downloading bumps the revision server-side, so the caller
  // should refresh state afterwards or the Rev shown on screen goes stale.
  return `/api/conslist/download?${new URLSearchParams({ platform, type, scope: category })}`;
}
