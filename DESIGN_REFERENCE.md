# Lepide design reference — Sunjeev fills this in BEFORE the exercise

- **Primary design-system Markdown path:** `design.md` (Lepidus AI Design Contract, generated 2026-10-15) — human decision 2026-10-21.
- **Other design-system Markdown paths:** NONE
- **Live reference URL:** https://lepide-design-system.vercel.app (visual reference; live page wins on conflict per design.md §1)
- **Approved asset paths:** `https://lepide-design-system.vercel.app/v1/lepidus.css` (linked in `source/src/app/layout.tsx`; reachable, HTTP 200, 148,925 bytes on 2026-10-21). `lepidus.js` (HTTP 200) is NOT loaded: no React-managed element uses data-lp-* hooks.
- **Licensing/fonts/icon notes:** lepidus.css contains no `@font-face`; Open Sans is loaded from Google Fonts so `--font-family-primary` (`'Open Sans', system-ui, sans-serif`) resolves. Sidebar icons are inline `currentColor` SVGs (Dashboard/Findings paths copied from design.md §5 Sidebar; Upload/Sign-out are local SVG paths).
- **Package vs fallback:** FALLBACK. `npm view @ramsarjal-404/react` and `@ramsarjal-404/css` → E404 on the public npm registry (2026-10-21). UI = React JSX rendering the documented §5 plain-HTML anatomy verbatim (`source/src/components/lp/`).

## System gap notes
1. **Dropdown behaviour (React):** Required pattern: single-select Dropdown in React-managed DOM. Closest: `lp-dropdown` + lepidus.js. Risk: hand-rolled open/close/Escape/outside-click may drift from lepidus.js. Temporary approach: local React port (`components/lp/Dropdown.tsx`) using the documented anatomy and `lp-dropdown__trigger--hidden`; keyboard arrow-key navigation within the list NOT implemented. Recommended: publish `@ramsarjal-404/react`.
2. **Filter (React-only):** Findings uses two single-select Dropdowns (type, risk) + "Clear filters" secondary Button instead of Filter.
3. **Charts (React-only):** Risk distribution uses `lp-progress` bars (one per risk, label states "<risk>: n of N files") instead of DonutChart/BarChart.
4. **File picker:** no Lepidus file-upload component. Native `<input type="file">` inside documented `lp-input` anatomy (label-top) with helper text in `lp-input__message`. Visual fit of the native file control inside the pill shell UNVERIFIED across browsers.
5. **Table empty cell:** `lp-table__empty-cell` is in the legal set but has no canonical example; EmptyState is used for both "no data" and "no filter matches".
6. **Risk → Badge mapping:** Badge has 5 variants; None=neutral, Low=success, Medium=warning, High=error, Critical=error. High and Critical share a colour; the risk text always distinguishes them.
7. **Lepide logo:** no approved logo asset file was supplied. The sidebar uses the logo SVG paths from design.md §5 Sidebar canonical header (`aria-label="Lepide" role="img"`). Its raw-hex fill has no exact token, so it is coloured with `var(--color-brand-accent)` (slightly different blue — human/design review needed).

The Agent must read real files and follow actual tokens/components. If missing in a real session, tell the human and resolve before UI work. In a rehearsal, assumptions must be clearly labelled SIMULATED.
