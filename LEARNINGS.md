# What I learned

After each phase, the Agent asks the developer for one useful learning and records it briefly.

- **Planning:**
- **Detection:** Resolve overlaps highest-risk-first and use digit/separator-aware lookarounds so cards never double-count as phones or match inside longer numbers. Test failures need triage before fixing: a failing mask test was a wrong expectation, not a detector bug.
- **Security/persistence:** Read the framework's bundled docs before trusting habits: Next 16 + cacheComponents rejects `export const runtime`, which only surfaced in `next build`, not in tests. Next 16 Proxy buffers matched request bodies, so keep upload APIs out of the matcher and authorise inside the route. A skipped integration suite is not evidence of RLS. Running it against the real DB found a constraint missing from the live schema that every mocked test had passed. `status=0` from supabase-js is a network/TLS error, not bad credentials.
- **UI:** Check the design-system package exists before planning around it (both returned E404). Copying canonical anatomy verbatim and listing every `lp-*` class in use against the legal sets caught drift (a `div` title turned into an `h1`) that tests would not.
- **Testing/deployment:**
- **What I'd do differently:**
