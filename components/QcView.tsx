"use client";

import { useState } from "react";
import { analyze } from "@/lib/api";
import type { AnalyzeResponse } from "@/lib/types";
import { Dropzone } from "./Dropzone";
import { ResultsTable } from "./ResultsTable";
import { StatCards } from "./StatCards";
import { Spinner } from "./icons";
import { Button, ErrorMsg, PageHead, Panel } from "./ui";

const EMPTY = { total: 0, matched: 0, unmatched: 0, duplicate: 0 };

export function QcView({ client }: { client: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  async function run() {
    if (!file) return;
    setError(null);
    setRunning(true);
    try {
      setResult(await analyze(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <PageHead title="QC Check" client={client}>
        Upload a .zip of drawing PDFs and generate the QC register.
      </PageHead>

      <StatCards summary={result?.summary ?? EMPTY} />

      <Panel>
        <Dropzone onFile={setFile} />

        <div className="mt-[18px] flex flex-wrap items-center gap-4">
          <Button onClick={run} disabled={!file || running}>
            {running ? (
              <>
                <Spinner />
                Analyzing…
              </>
            ) : (
              "Run QC"
            )}
          </Button>
          <span className="text-sm text-muted">{file ? file.name : "No file selected"}</span>
        </div>

        {error && <ErrorMsg>{error}</ErrorMsg>}
      </Panel>

      {result && <ResultsTable rows={result.rows} reportToken={result.reportToken} />}
    </>
  );
}
