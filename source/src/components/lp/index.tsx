// React renderings of documented Lepidus plain-HTML anatomy (design.md §5). Class names and nesting copied verbatim.
import type { ReactNode } from "react";
import type { Risk } from "../../lib/detection/types";
import { RISK_BADGE } from "../../lib/ui/labels";

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span className={`lp-badge lp-badge--${RISK_BADGE[risk]}`}>
      <span className="lp-badge__dot"></span>
      {risk}
    </span>
  );
}

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="lp-card">
      {title !== undefined && (
        <div className="lp-card__header">
          <div className="lp-card__title">{title}</div>
          {actions && <div className="lp-card__actions">{actions}</div>}
        </div>
      )}
      <div className="lp-card__body">{children}</div>
    </section>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="lp-spinner lp-spinner--md" role="status">
      <svg className="lp-spinner__svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="lp-spinner__track" cx="12" cy="12" r="10" strokeWidth="3" />
        <circle
          className="lp-spinner__arc"
          cx="12"
          cy="12"
          r="10"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="28 72"
        />
      </svg>
      <span className="lp-spinner__visually-hidden">{label}</span>
    </span>
  );
}

export function ErrorMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="lp-message lp-message--error" role="alert">
      <span className="lp-message__icon">
        <svg viewBox="0 0 45 45" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="41" height="41" rx="10" stroke="currentColor" strokeWidth="3" />
          <path
            d="M22.5 12 33 31.5H12L22.5 12Z"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M22.5 20v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="22.5" cy="28.5" r="1.2" fill="currentColor" />
        </svg>
      </span>
      <div className="lp-message__content">
        <div className="lp-message__text">
          <h3 className="lp-message__title">{title}</h3>
          <p className="lp-message__body">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="lp-empty-state">
      <span className="lp-empty-state__illustration">
        <svg
          width="120"
          height="70"
          viewBox="0 0 120 70"
          fill="none"
          stroke="var(--color-border-strong, #555766)"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="20" y="10" width="80" height="22" rx="4" />
          <rect x="20" y="38" width="80" height="22" rx="4" />
          <circle cx="32" cy="21" r="3" />
          <circle cx="32" cy="49" r="3" />
          <path d="M44 21h32M44 49h20" />
        </svg>
      </span>
      <p className="lp-empty-state__message">{message}</p>
      {action && <div className="lp-empty-state__action">{action}</div>}
    </div>
  );
}

export function Progress({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="lp-progress lp-progress--full-width">
      <span className="lp-progress__label">{label}</span>
      <div className="lp-progress__row">
        <div
          className="lp-progress__track"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div className="lp-progress__fill" style={{ width: `${pct}%` }}></div>
        </div>
        <span className="lp-progress__value">{pct}%</span>
      </div>
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
}

/** Cells render React text nodes only, so untrusted values (e.g. filenames) are escaped. */
export function Table<T>({ caption, columns, rows, rowKey }: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="table-scroll">
      <div className="lp-table">
        <table className="lp-table__table">
          <caption style={{ position: "absolute", clip: "rect(0 0 0 0)" }}>{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="lp-table__th" scope="col">
                  <div className="lp-table__header-inner">
                    <span className="lp-table__header-label">{c.header}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c) => (
                  <td key={c.key} className="lp-table__td">
                    <div className="lp-table__cell-inner">{c.cell(r)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const CellText = ({ children }: { children: ReactNode }) => (
  <span className="lp-table__cell-text">{children}</span>
);
