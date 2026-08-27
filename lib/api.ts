import {
  mockAnalyze,
  mockConsAdd,
  mockConsAddProject,
  mockConsDeleteProject,
  mockConsState,
  mockDownloadUrl,
  mockLogin,
  mockLogout,
  mockMe,
  mockTagReport,
} from "./mock";
import type { AnalyzeResponse, ConsAddResponse, ConsState, TagReportResponse, User } from "./types";

/**
 * The UI's data layer — currently standalone.
 *
 * Every function here answers from ./mock and no request leaves the browser. All calls to the
 * C# backend (DrawingQC.Web) have been taken out; the fetch helpers and the real endpoints are
 * kept commented out at the bottom of this file so they can be restored against a future
 * backend. The C# project itself is no longer in the repo — it was deleted once the UI stopped
 * depending on it, and survives only in git history (last present at commit 5b2f5b2).
 *
 * Consequence worth remembering: none of this does real work. No PDF is read, no Excel is
 * written, no drawing is compared. Every row and count comes from a fixture.
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

// ---------- auth ----------

export async function me(): Promise<{ user: User }> {
  const session = await mockMe();
  if (!session) throw new UnauthorizedError();
  return session;
}

export function login(loginName: string, _password: string, remember: boolean): Promise<{ user: User }> {
  // No credential check: any non-empty username and password are accepted.
  return mockLogin(loginName, remember);
}

export function logout(): Promise<{ ok: boolean }> {
  return mockLogout();
}

// ---------- QC Check ----------

export function analyze(file: File): Promise<AnalyzeResponse> {
  return mockAnalyze(file);
}

/** Always "#" — there is no backend to serve the file. */
export function reportUrl(_token: string): string {
  return mockDownloadUrl();
}

// ---------- KBR Tagwise Delivery Report ----------

/** Client Excel (expected drawings) + a zip of delivered .dwg/.pdf files. Neither is read. */
export function tagReport(_excel: File, _zip: File): Promise<TagReportResponse> {
  return mockTagReport();
}

// ---------- ConsList ----------

export function consState(): Promise<ConsState> {
  return mockConsState();
}

export function consAddProject(name: string): Promise<{ ok: boolean }> {
  return mockConsAddProject(name);
}

export function consDeleteProject(name: string): Promise<{ ok: boolean }> {
  return mockConsDeleteProject(name);
}

export function consAdd(platform: string, category: string, files: File[]): Promise<ConsAddResponse> {
  return mockConsAdd(platform, category, files);
}

/** Always "#" — there is no backend to serve the file. */
export function consDownloadUrl(_platform: string, _category: string, _type: "excel" | "pdf"): string {
  return mockDownloadUrl();
}

/* ---------------------------------------------------------------------------------------------
 * REMOVED: the C# backend calls.
 *
 * Everything below is the previous implementation, kept verbatim for whenever the backend is
 * wired back up. To restore: uncomment this block, delete the mock-backed bodies above, and
 * re-enable the /api/* rewrite in next.config.ts (it is commented out there too).
 *
 * These went to same-origin /api/*, which next.config.ts rewrote to the backend. Same-origin was
 * load-bearing, not cosmetic: the backend's session cookie is HttpOnly, so it only rode along
 * while the browser believed these were same-origin requests. Pointing the UI straight at the
 * backend silently broke sign-in.
 *
 * Failures came back either as ASP.NET ProblemDetails ({ detail }) or as our own ({ error }), so
 * both shapes were unwrapped.
 *
 * async function unwrap<T>(res: Response): Promise<T> {
 *   if (res.status === 401) throw new UnauthorizedError();
 *   const data = await res.json().catch(() => ({}) as Record<string, string>);
 *   if (!res.ok) throw new Error(data.detail || data.error || "Request failed.");
 *   return data as T;
 * }
 *
 * async function get<T>(url: string): Promise<T> {
 *   return unwrap<T>(await fetch(url));
 * }
 *
 * async function postJson<T>(url: string, body: unknown): Promise<T> {
 *   return unwrap<T>(
 *     await fetch(url, {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify(body),
 *     }),
 *   );
 * }
 *
 * async function postForm<T>(url: string, fd: FormData): Promise<T> {
 *   return unwrap<T>(await fetch(url, { method: "POST", body: fd }));
 * }
 *
 * // auth
 * me()               -> get<{ user: User }>("/api/auth/me")
 * logout()           -> postJson<{ ok: boolean }>("/api/auth/logout", {})
 * login(l, p, r)     -> postJson<{ user: User }>("/api/auth/login", { login: l, password: p, remember: r })
 *                       .catch(err => { if (err instanceof UnauthorizedError)
 *                                         throw new Error("Invalid username or password.");
 *                                       throw err; })
 *
 * // QC Check — fd.append("file", file)
 * analyze(file)      -> postForm<AnalyzeResponse>("/api/analyze", fd)
 * reportUrl(token)   -> `/api/report/${token}`
 *
 * // KBR Tagwise Delivery — fd.append("excelFile", excel); fd.append("zipFile", zip)
 * tagReport(e, z)    -> postForm<TagReportResponse>("/api/kbr/tagreport", fd)
 *
 * // ConsList — for consAdd, the field name is "files" (plural) for every file; the backend
 * // reads them as one batch: for (const f of files) fd.append("files", f, f.name)
 * consState()        -> get<ConsState>("/api/conslist/state")
 * consAddProject(n)  -> postJson<{ ok: boolean }>("/api/conslist/project", { name: n })
 * consDeleteProject  -> postJson<{ ok: boolean }>("/api/conslist/project/delete", { name: n })
 * consAdd(p, c, f)   -> postForm<ConsAddResponse>("/api/conslist/add", fd)
 *
 * // Downloading bumped the revision counter server-side, so the caller had to refresh state
 * // afterwards or the Rev shown on screen went stale.
 * consDownloadUrl    -> `/api/conslist/download?${new URLSearchParams({ platform, category, type })}`
 * ------------------------------------------------------------------------------------------ */
