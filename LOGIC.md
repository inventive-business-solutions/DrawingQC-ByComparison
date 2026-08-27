# Tool Logic Reference

What **QC Check**, **ConsList**, and **Booklet** actually do, written so the logic can be
rebuilt in another language later (Next.js/TypeScript, Python/Frappe) without reading the C#.

The C# backend that implemented all three has been **removed from this repo** — it is now a
frontend-only Next.js project. This document is therefore the specification, not a summary of
code you can open: the sources below exist only in git history, at commit `5b2f5b2` and earlier.
Recover one with `git show 5b2f5b2:<path>`.

| Tool | Source (historical, at `5b2f5b2`) | Lines |
|---|---|---|
| QC Check | `DrawingQC.UI/QcEngine.cs` | 221 |
| ConsList | `DrawingQC.Web/ConsList.cs` | 311 |
| Booklet | `DrawingQC.Web/Booklet.cs` | 1197 |

### Libraries to replace

| C# library | Job | JavaScript | Python |
|---|---|---|---|
| ClosedXML | read/write .xlsx | `exceljs` | `openpyxl` |
| UglyToad.PdfPig | read text inside PDFs | `pdf.js` | `pdfplumber` |
| PDFsharp | merge/copy PDF pages | `pdf-lib` | `pypdf` |
| DocumentFormat.OpenXml | edit .docx structure | `docx` / `docxtemplater` | `python-docx` |
| Word COM (`Word.Application`) | .docx → .pdf | **no equivalent** | **no equivalent** |

> The last row is the hard one. See [Booklet — the Word problem](#the-word-problem).

---

## 1. QC Check

**Question it answers:** does the drawing number in the *file name* match the number printed
*inside* the PDF?

**Input:** a `.zip` of drawing PDFs · **Output:** a colour-coded `.xlsx`

### The drawing-number pattern

Everything hinges on one regex (`QcEngine.cs:20`):

```
\d{3}-[A-Z0-9]{2,5}-[A-Z0-9]{1,5}-\d{4}
```

```
265-S2N-ACD-5003
│    │    │    └── exactly 4 digits
│    │    └────── 1-5 alphanumeric
│    └─────────── 2-5 alphanumeric
└──────────────── 3 digits
```

**Why the last block is pinned to exactly 4 digits:** PDF text extraction often glues adjacent
title-block text onto the number — `...-5003` comes out as `...-500330`. An open-ended `\d+`
would swallow the junk. Keep this constraint in any port.

### Steps

1. Open the zip, take every `.pdf`, sort by name (case-insensitive)
2. **From the file name:** split on `&` — a file named `A & B.pdf` holds two drawings, both
   get checked. Apply the regex to each segment. If it doesn't match, fall back to the cleaned
   name (strips repeated `"Copy of "` prefixes, uppercases)
3. **From inside the PDF:** extract text from every page, collect all regex matches into a set
4. **Compare** — matched means the name set and content set are *exactly equal*
   (`SetEquals`, not "contains"), and the name set is non-empty, and the PDF read without error
5. **Duplicates, across the whole batch:** count every drawing number over all PDFs; any number
   seen 2+ times marks every row carrying it

### Status

Duplicate wins over Matched, so a repeated drawing always surfaces (`QcEngine.cs:216-218`):

```
Duplicate  ─ number appears in 2+ PDFs        🟨 fill FFEB9C / text 9C6300
Matched    ─ name set == content set          🟩 fill C6EFCE / text 006100
Unmatched  ─ anything else                    🟥 fill FFC7CE / text 9C0006
```

A PDF that fails to open is **Unmatched**, with the error kept on the row — not a crash.

### Excel report (`QcEngine.cs:125`)

Sheet **"Drawing QC"** — 5 columns: `Sr.No`, `Support PDF`, `1st drawing name`,
`2nd drawing name`, `Status`. Header dark slate `374759`, white bold. Each row filled with its
status colour. Frozen top row, autofilter, column widths `8 / 55 / 24 / 24 / 14`. Empty drawing
cells show `-`.

Sheet **"Summary"** — totals for Total PDFs / Matched / Unmatched / Duplicate, each tinted to
match.

---

## 2. ConsList

**What it does:** you add an Excel or PDF each day; it stacks them into one running consolidated
file to send the client as Rev 1, 2, 3…N.

### Storage

No database — files on disk (`ConsList.cs:40-61`):

```
%APPDATA%\SupportAutomation\ConsList\
├── projects.json                     the project dropdown
└── <Platform>\<Category>\
    ├── consolidated.xlsx             the running Excel
    ├── consolidated.pdf              the running PDF
    └── manifest.json                 add-log + revision counters
```

Platform and category names are sanitised into safe folder names. Category falls back to
`Internal` if unrecognised. All mutations are wrapped in a single process-wide lock — the
files are the source of truth, nothing is cached in memory.

### Appending Excel (`ConsList.cs:139`)

1. Open the uploaded workbook, **auto-pick the sheet with the most used rows** — the user never
   selects a sheet
2. Take its used range (first/last row and column)
3. Open `consolidated.xlsx`, prefer the worksheet named `Consolidated`, else the first; create
   the workbook and that sheet if this is the first add
4. Start writing at `lastUsedRow + 1`
5. **Date banner** — if this is the first Excel added *today*, write one bold cell with
   `dd-MM-yyyy` on a light blue `DBE4F0` background, then move down a row. Once per day, not
   once per file
6. Copy every source row that has at least one non-empty cell, cell by cell, **always starting
   at column 1** regardless of where the source range began. No extra columns are added — rows
   land verbatim
7. Auto-fit columns, save

### Appending PDF (`ConsList.cs:194`)

Open `consolidated.pdf` (or create it), copy every page of the upload onto the end, save. That's all.

### Manifest

Each add records `{ Date, Name, Count }` — count being rows appended for Excel, pages for PDF.
This drives the on-screen log and the totals. It also holds `LastExcelDate` (so the banner fires
once a day) and `ExcelRev` / `PdfRev`.

Unsupported extensions and per-file exceptions are collected into an error list — one bad file
does not abort the batch.

### Download (`ConsList.cs:290`)

Reading the file for download **increments the revision counter** — every share is the next Rev N:

```
S2NERGY_Internal_Consolidated_Rev3_2026-08-26.xlsx
```

Worth knowing: the counter is a download counter, not a content counter. Downloading twice
without adding anything still gives you Rev 4.

---

## 3. Booklet

**What it does:** fills a Word template from an Excel support list, converts it to PDF, and
appends a drawings PDF — one deliverable booklet.

**Inputs:** `.docx` template · `.xlsx` support list · drawings `.pdf` · optional BOM `.xlsx` ·
a revision block (Rev, Date, Description, Prepared, Verified, Approved)

**Outputs:** the merged `.pdf`, plus the filled `.docx` (booklet body only — appended drawings
can't live in Word)

### Pipeline (`Booklet.cs:42`)

```
template.docx ──copy──> work.docx
                          │  1. fill from Excel + BOM
                          ▼
                     filled.docx ──Word COM──> booklet.pdf
                          │                        │  3. append
                          │ handed out as         ▼
                          └─ the .docx download   final.pdf
```

### Reading the Excel (`Booklet.cs:912`)

- Row 1 is a title, row 2 is the header, **data starts at row 3**
- 7 columns: `S.L.`, `SUPPORT No.`, `DRAWING No.`, `REVISION`, `LEVEL`, `PRESENT STATUS`, `REMARKS`
- A row is data if column 1 or column 2 is non-empty
- **Sheet auto-detect:** a workbook may hold `BATCH-1/2/3`. With no sheet named, pick the one
  with the **most data rows** — a Batch-3 file uses BATCH-3's 568 rows, not BATCH-2's 563.
  When a name *is* given, match exactly first, then ignoring spaces

### Filling the Word document (`Booklet.cs:89`)

In order: cover revision block → "Total number of Supports" → Material Statistics from the BOM
(if supplied) → compact the front matter → build the Appendix A list.

**Two template generations are supported.** Older templates ship pre-made "CABLE TRAY SUPPORTS"
tables to be filled and extended; newer ones have none, so the tables are generated from scratch
and inserted after the `CABLE TRAY SUPPORT LIST` heading. Detection is by looking for those
tables — any port must handle both.

`CompactFrontMatter` reclaims empty vertical gaps in sections 1–4 so a taller Material Statistics
table (more BOM rows) still fits on its page.

### Page layout — the fiddly part

**45 data rows per page** (`RowsPerPage`).

**Orphan folding** (`Booklet.cs:517`): if the last page would hold ≤5 rows, those rows are folded
onto the previous page. 226 rows becomes `45,45,45,45,46` rather than a final page with one row.

**Page budget** (`Booklet.cs:203`): available body height is computed from the real section
properties — page height, top/bottom margin, header distance — minus the tallest repeating header,
minus 750 twips for the table title and header rows, minus 300 safety, clamped to `6000..15000`.
Header height gets a **×1.35 buffer** because logos render taller than their declared row heights;
without it, 45 rows overflow by a few and spill onto a short continuation page.

Row height is then `pageBudget / max(45, rowsOnThisPage)`, clamped `180..340` — so a folded
46-row page uses slightly shorter rows and still fits.

**Column widths** are scaled to the template's printable width from minimums
`{480, 1680, 1680, 1000, 1600, 1550, 850}`. Defaults `{557, 1720, 1720, 1148, 2015, 2240, 1172}`
are tuned so 14-character `HK-CTS-…-####` tags fit on one line at 9pt, and the `PRESENT STATUS`
header stays on one line — the extra width is taken from the mostly-empty `REMARKS` column.

Data font is 9pt (18 half-points). Borders are thin, faint `BFBFBF`, uniform, with per-cell
overrides stripped.

### The Word problem

`ExportPdfWithMeta` (`Booklet.cs:1076`) drives **Microsoft Word through COM**:

1. Open the filled docx invisibly, alerts off
2. Wildcard find/replace for `Rev. ##` and `Date: dd-mm-yyyy` across headers and body — the
   patterns are deliberately loose so any template's existing values are matched
3. `ComputeStatistics(2)` for the real page count, then replace `" of N"` — so "Sheet X of N"
   reflects the booklet body, **not** the appended drawings
4. Update all Tables of Contents, then all fields, so page numbers and Appendix A/B entries are right
5. Save (this docx becomes the Word download)
6. `ExportAsFixedFormat(path, 17)` → PDF
7. Close and quit in a `finally` — an orphaned WINWORD process otherwise leaks

Then `MergePdfs` appends the drawings PDF page by page.

**This step is Windows-only and requires Microsoft Word installed.** `Build()` throws
`PlatformNotSupportedException` up front if not on Windows.

Steps 3 and 4 are the blocker for any port. Nothing in Node or Python reproduces Word's own
pagination and TOC field update — LibreOffice `--convert-to pdf` is the usual substitute, but it
repaginates differently, so the 45-rows-per-page tuning above must be re-verified against real
templates before trusting it.

---

## Porting notes

**Order of difficulty:**

1. **ConsList** — easiest. Append rows, append pages. A day's work in any language.
2. **QC Check** — moderate. The regex and set comparison port directly; PDF text extraction is
   the variable. Different extractors return text in different orders and with different
   glue-artifacts, so re-verify the 4-digit constraint against real drawings.
3. **Booklet** — hardest, and not a port so much as a rewrite. The Word COM dependency has no
   equivalent, and ~600 lines of it is page-fitting logic tuned empirically against real templates.

**Do not carry these over by assumption — verify each against real files:**

- the 4-digit tail on the drawing-number regex
- the ×1.35 header buffer
- 45 rows/page and the ≤5-row orphan fold
- column widths tuned for 14-character tags
- "most data rows wins" sheet auto-detect (used by both ConsList and Booklet, for different reasons)

**Also note:** `AutoCadSync.cs` drives a running AutoCAD via Windows COM from the Running Object
Table. It cannot move off Windows, and cannot reach an AutoCAD on a different machine than the
backend.
