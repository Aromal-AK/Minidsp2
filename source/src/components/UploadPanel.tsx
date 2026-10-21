"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { Finding, Risk } from "../lib/detection/types";
import { uploadErrorMessage, type UploadErrorMessage } from "../lib/upload/messages";
import { Card, EmptyState, ErrorMessage, RiskBadge, Spinner } from "./lp";
import { ScanResultTable } from "./ScanResultTable";

export interface ScanResponse {
  scanId: string;
  safeName: string;
  sizeBytes: number;
  fileRisk: Risk;
  findings: Finding[];
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: UploadErrorMessage }
  | { status: "done"; result: ScanResponse };

export function UploadPanel() {
  const [state, setState] = useState<State>({ status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setState({ status: "error", message: { title: "No file selected.", body: "Choose a CSV or TXT file to scan." } });
      return;
    }
    const form = new FormData();
    form.append("file", file);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/scan", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ status: "error", message: uploadErrorMessage(json?.error) });
        return;
      }
      setState({ status: "done", result: json as ScanResponse });
    } catch {
      setState({ status: "error", message: uploadErrorMessage(undefined) });
    }
  }

  const loading = state.status === "loading";

  return (
    <div className="stack">
      <Card title="Scan a file">
        <form className="stack" onSubmit={onSubmit} noValidate>
          <div className="lp-input lp-input--full-width">
            <div className="lp-input__row lp-input__row--label-top">
              <label className="lp-input__label" htmlFor={inputId}>Synthetic file</label>
              <div className={`lp-input__field${loading ? " lp-input__field--disabled" : ""}`}>
                <input
                  ref={fileRef}
                  className="lp-input__input"
                  id={inputId}
                  name="file"
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  aria-describedby={hintId}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="lp-input__message" id={hintId}>
              CSV or TXT, up to 1 MB. Use synthetic data only — the original file is not stored.
            </div>
          </div>
          <div className="toolbar">
            <button type="submit" className="lp-button lp-button--primary lp-button--md" disabled={loading}>
              Scan file
            </button>
            {loading && <Spinner label="Scanning file…" />}
          </div>
        </form>
      </Card>

      {state.status === "error" && <ErrorMessage title={state.message.title} body={state.message.body} />}

      {state.status === "done" && (
        <Card title={`Result: ${state.result.safeName}`} actions={<RiskBadge risk={state.result.fileRisk} />}>
          {state.result.findings.length === 0 ? (
            <EmptyState message="No sensitive data was found in this file. It is classified as None." />
          ) : (
            <ScanResultTable findings={state.result.findings} />
          )}
        </Card>
      )}
    </div>
  );
}
