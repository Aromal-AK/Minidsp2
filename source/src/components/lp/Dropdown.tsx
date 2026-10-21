"use client";

// React port of the documented single-select Dropdown anatomy (design.md §5).
// lepidus.js is not used on React-managed DOM, so open/close/Escape/outside-click live here.
import { useEffect, useId, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

export function Dropdown({ placeholder, options, value, onChange }: {
  placeholder: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    rootRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"], [role="option"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="lp-dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`lp-dropdown__trigger${open ? " lp-dropdown__trigger--hidden" : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="lp-dropdown__trigger-label">{selected?.label ?? placeholder}</span>
        <svg className="lp-dropdown__chevron" viewBox="0 0 12 6" fill="none" stroke="currentColor"
             strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M1 1l5 4 5-4" /></svg>
      </button>
      <div className="lp-dropdown__panel" hidden={!open}>
        <div className="lp-dropdown__header" onClick={() => setOpen(false)}>
          <span className="lp-dropdown__header-label">{placeholder}</span>
          <svg className="lp-dropdown__chevron lp-dropdown__chevron--open" viewBox="0 0 12 6" fill="none"
               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M1 1l5 4 5-4" /></svg>
        </div>
        <div className="lp-dropdown__list" role="listbox" aria-label={placeholder} id={listId}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className="lp-dropdown__option"
              role="option"
              aria-checked={o.value === value}
              aria-selected={o.value === value}
              onClick={() => pick(o.value)}
            >
              <span className="lp-dropdown__option-label">{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
