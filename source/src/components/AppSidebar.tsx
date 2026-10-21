"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "../app/login/actions";

const ICON_PROPS = { fill: "none", "aria-hidden": true, focusable: false } as const;
const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const NAV: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON_PROPS}>
        <path d="M4 4H10V12H4V4Z" {...stroke} />
        <path d="M4 16H10V20H4V16Z" {...stroke} />
        <path d="M14 12H20V20H14V12Z" {...stroke} />
        <path d="M14 4H20V8H14V4Z" {...stroke} />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON_PROPS}>
        <path d="M12 16V4M7 9l5-5 5 5M4 20h16" {...stroke} />
      </svg>
    ),
  },
  {
    href: "/findings",
    label: "Findings",
    icon: (
      <svg viewBox="0 0 30 30" {...ICON_PROPS}>
        <path
          d="M5 15H5.0125M5 7.5H5.0125M5 22.5H5.0125M10 22.5H12.5M10 15H12.5M10 7.5H12.5M17.5 7.5H25M17.5 15H25M17.5 22.5H25"
          {...stroke}
        />
      </svg>
    ),
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <nav className="lp-sidebar" aria-label="Primary" style={{ width: "100px" }}>
      <div className="lp-sidebar__header">
        {/* Logo paths from design.md §5 Sidebar; its raw-hex fill is replaced by a token (no exact token exists). */}
        <svg className="app-logo" width="40" height="26" viewBox="0 0 40 26" fill="currentColor" aria-label="Lepide" role="img">
          <path d="M10 2h6l-10 22h-6Z" /><path d="M20 2h6l-10 22h-6Z" /><path d="M30 2h6l-10 22h-6Z" />
        </svg>
        <span className="app-brand">MiniDSP</span>
      </div>
      <ul className="lp-sidebar__items">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`lp-sidebar__item${active ? " lp-sidebar__item--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="lp-sidebar__icon-box">{item.icon}</span>
                <span className="lp-sidebar__label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="lp-sidebar__footer">
        <form action={signOut}>
          <button type="submit" className="lp-sidebar__item">
            <span className="lp-sidebar__icon-box">
              <svg viewBox="0 0 24 24" {...ICON_PROPS}>
                <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" {...stroke} />
              </svg>
            </span>
            <span className="lp-sidebar__label">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
