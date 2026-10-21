import { exportFilename, findingsToCsv, type FindingExportRow } from "../../../../lib/findings/export";
import { parseFindingFilters } from "../../../../lib/findings/filters";
import { createClient } from "../../../../lib/supabase/server";

// Request-time by default (reads cookies and the request URL); /api is outside the proxy matcher, so auth is enforced here.

const UTF8_BOM = "\uFEFF"; // lets Excel read non-ASCII file names correctly

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const filters = parseFindingFilters(Object.fromEntries(new URL(request.url).searchParams));

  // Same query as the Findings page; RLS limits rows to the signed-in user.
  let query = supabase
    .from("findings")
    .select("id, type, risk, count, masked_example, scans(file_name, created_at)")
    .limit(1000);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.risk) query = query.eq("risk", filters.risk);
  const { data, error } = await query;
  if (error) return Response.json({ error: "EXPORT_FAILED" }, { status: 500 });

  return new Response(UTF8_BOM + findingsToCsv((data ?? []) as unknown as FindingExportRow[]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(filters)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
