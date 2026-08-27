# DrawingQC — Next.js UI

React/Next.js front end for DrawingQC.

> **No backend is connected yet.** The C# API that used to serve `/api/*` was removed from
> this repo. The UI runs and renders fine, but Run QC / Sync / Booklet will fail until a
> backend is wired up — see [Connecting a backend](#connecting-a-backend).

## Running it

```bash
cd drawingqc-ui
npm install
npm run dev
```

Open <http://localhost:3001>.

> Run this from **inside WSL**, not from Windows over `\\wsl.localhost\...`. Turbopack
> rejects UNC paths and fails with *"Cannot depend on path … outside of root directory"*.

## Connecting a backend

`next.config.ts` proxies `/api/*` to `DRAWINGQC_API`. Point it at whatever serves the API:

```bash
DRAWINGQC_API=http://<host>:<port> npm run dev
```

Because the proxy makes it same-origin, the backend needs **no CORS setup**.

### Endpoints the UI expects

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/analyze` | multipart, field `file` = `.zip` | `{ reportToken, reportName, summary, rows }` |
| GET | `/api/report/{token}` | — | `.xlsx` download |
| POST | `/api/sync-autocad` | `{ rows: [...] }` | `{ ok, count }` |
| POST | `/api/booklet` | multipart: `rev`, `date`, `description`, `prepared`, `verified`, `approved` + `templateFile`/`templatePath`, `excelFile`/`excelPath`, `drawingsFile`/`drawingsPath` | `{ ok, fileName, sizeMB }` |
| GET | `/api/booklet/download` | — | `.pdf` download |

`summary` is `{ total, matched, unmatched, duplicate }`. Each row is
`{ srNo, fileName, drawing1, drawing2, status }` where `status` is
`"Matched" | "Unmatched" | "Duplicate"`.

Errors are read as `{ detail }` or `{ error }`, whichever is present.

Exact shapes live in [`lib/types.ts`](lib/types.ts); the fetch wrappers are in
[`lib/api.ts`](lib/api.ts) — that one file is the only place to change if the API moves.

## Layout

| Path | Purpose |
|---|---|
| `app/page.tsx` | Client/tool tab state, view switching |
| `components/Sidebar.tsx` | Brand, workspace nav, status-key legend |
| `components/Toolbar.tsx` | Client tabs + per-client tool tabs |
| `components/QcView.tsx` | Upload → analyze → results |
| `components/Dropzone.tsx` | Drag-and-drop `.zip` picker |
| `components/StatCards.tsx` | Total / Matched / Unmatched / Duplicate |
| `components/ResultsTable.tsx` | Filterable table, Sync to AutoCAD, Excel download |
| `components/BookletView.tsx` | Revision block + three file inputs → merged PDF |
| `components/PlaceholderView.tsx` | Shell for tools with no logic yet |
| `lib/api.ts` | Typed wrappers over the five endpoints |
| `lib/types.ts` | Response types + the `TOOLS` client→tools map |

Adding a tool to a client is a one-line change in `TOOLS` (`lib/types.ts`) plus a view in
`app/page.tsx`.

## Styling

Tailwind CSS v4. The palette lives in `app/globals.css` under `@theme`
(`bg-match-bg`, `text-unmatch-fg`, …). The brand gradient is the `grad` / `grad-text`
utility.
