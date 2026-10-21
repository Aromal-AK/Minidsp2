import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Requires the 0001_init.sql migration applied and two pre-created synthetic test users in .env.local.
const env = process.env;
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const A = { email: env.TEST_USER_A_EMAIL, password: env.TEST_USER_A_PASSWORD };
const B = { email: env.TEST_USER_B_EMAIL, password: env.TEST_USER_B_PASSWORD };
const missing = [
  ["NEXT_PUBLIC_SUPABASE_URL", URL],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON],
  ["TEST_USER_A_EMAIL", A.email],
  ["TEST_USER_A_PASSWORD", A.password],
  ["TEST_USER_B_EMAIL", B.email],
  ["TEST_USER_B_PASSWORD", B.password],
]
  .filter(([, v]) => !v)
  .map(([k]) => k);
const SKIP_REASON = `SKIPPED: missing in .env.local: ${missing.join(", ")}`;
if (missing.length) console.warn(`[rls.integration] ${SKIP_REASON}`);

const newClient = () =>
  createClient(URL!, ANON!, { auth: { persistSession: false, autoRefreshToken: false } });

async function signedIn(label: string, creds: { email?: string; password?: string }): Promise<SupabaseClient> {
  const c = newClient();
  const { error } = await c.auth.signInWithPassword({ email: creds.email!, password: creds.password! });
  // Error code/status only; never credentials.
  if (error) throw new Error(`test user ${label} sign-in failed: code=${error.code ?? "?"} status=${error.status ?? "?"}`);
  return c;
}

const TEST_FILE_NAMES = [
  "rls-test.csv",
  "atomic-test.csv",
  "mismatch-test.csv",
  "bad-findings.csv",
  "unmasked-test.csv",
  "spoof.csv",
];

const validFindings = [
  { type: "email", risk: "Low", count: 2, masked_example: "a***@example.test" },
  { type: "payment_card", risk: "Critical", count: 1, masked_example: "************1111" },
];

const countScans = async (c: SupabaseClient) => {
  const { count, error } = await c.from("scans").select("id", { count: "exact", head: true });
  if (error) throw new Error("count failed");
  return count ?? 0;
};

describe.skipIf(missing.length > 0)(`RLS integration${missing.length ? ` (${SKIP_REASON})` : ""}`, { timeout: 30_000 }, () => {
  let a: SupabaseClient;
  let b: SupabaseClient;
  let scanId: string;

  beforeAll(async () => {
    a = await signedIn("A", A);
    b = await signedIn("B", B);
    const { data, error } = await a.rpc("save_scan", {
      p_file_name: "rls-test.csv",
      p_size_bytes: 100,
      p_file_risk: "Critical",
      p_findings: validFindings,
    });
    expect(error).toBeNull();
    scanId = data as string;
  });

  afterAll(async () => {
    // Removes only A's own rows created by this suite (RLS-scoped), including any wrongly accepted ones.
    if (a) await a.from("scans").delete().in("file_name", TEST_FILE_NAMES);
  });

  it("A can read its own scan and findings", async () => {
    const { data: s } = await a.from("scans").select("id,total_findings").eq("id", scanId);
    expect(s).toHaveLength(1);
    expect(s![0].total_findings).toBe(3);
    const { data: f } = await a.from("findings").select("id").eq("scan_id", scanId);
    expect(f).toHaveLength(2);
  });

  it("B cannot read A's scans or findings", async () => {
    const { data: s, error: se } = await b.from("scans").select("id").eq("id", scanId);
    expect(se).toBeNull();
    expect(s).toHaveLength(0);
    const { data: f, error: fe } = await b.from("findings").select("id").eq("scan_id", scanId);
    expect(fe).toBeNull();
    expect(f).toHaveLength(0);
  });

  it("B cannot attach a finding to A's scan (default user_id = B -> composite FK fails)", async () => {
    const { error } = await b
      .from("findings")
      .insert({ scan_id: scanId, type: "email", risk: "Low", count: 1, masked_example: "b***@example.test" });
    expect(error).not.toBeNull();
  });

  it("B cannot insert a finding claiming A's user_id (RLS WITH CHECK)", async () => {
    const { data: s } = await a.from("scans").select("user_id").eq("id", scanId).single();
    const { error } = await b.from("findings").insert({
      scan_id: scanId,
      user_id: s!.user_id,
      type: "email",
      risk: "Low",
      count: 1,
      masked_example: "b***@example.test",
    });
    expect(error).not.toBeNull();
  });

  it("B cannot insert a scan with user_id = A", async () => {
    const { data: s } = await a.from("scans").select("user_id").eq("id", scanId).single();
    const { error } = await b
      .from("scans")
      .insert({ user_id: s!.user_id, file_name: "spoof.csv", size_bytes: 1, file_risk: "None", total_findings: 0 });
    expect(error).not.toBeNull();
  });

  it("B deleting A's scan affects 0 rows", async () => {
    const { data, error } = await b.from("scans").delete().eq("id", scanId).select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
    const { data: still } = await a.from("scans").select("id").eq("id", scanId);
    expect(still).toHaveLength(1);
  });

  it("anon cannot read scans or findings", async () => {
    const anon = newClient();
    for (const t of ["scans", "findings"]) {
      const { data, error } = await anon.from(t).select("id");
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
    const { error } = await anon.rpc("save_scan", {
      p_file_name: "x.txt",
      p_size_bytes: 1,
      p_file_risk: "None",
      p_findings: [],
    });
    expect(error).not.toBeNull();
  });

  it("save_scan is atomic: one invalid finding -> error and no new scan", async () => {
    const before = await countScans(a);
    const { error } = await a.rpc("save_scan", {
      p_file_name: "atomic-test.csv",
      p_size_bytes: 50,
      p_file_risk: "Critical",
      p_findings: [validFindings[0], { type: "payment_card", risk: "Critical", count: 0, masked_example: "************1111" }],
    });
    expect(error).not.toBeNull();
    expect(await countScans(a)).toBe(before);
  });

  it("save_scan rejects a file_risk that doesn't match its findings (no scan created)", async () => {
    const before = await countScans(a);
    for (const [risk, findings] of [
      ["Low", validFindings],
      ["Critical", []],
      ["None", [validFindings[0]]],
    ] as const) {
      const { error } = await a.rpc("save_scan", {
        p_file_name: "mismatch-test.csv",
        p_size_bytes: 50,
        p_file_risk: risk,
        p_findings: findings,
      });
      expect(error).not.toBeNull();
    }
    expect(await countScans(a)).toBe(before);
  });

  it("save_scan rejects a risk that doesn't match the type and duplicate types (no scan created)", async () => {
    const before = await countScans(a);
    const bad = [
      ["risk/type mismatch", [{ type: "email", risk: "Critical", count: 1, masked_example: "a***@example.test" }]],
      ["duplicate type", [validFindings[0], validFindings[0]]],
    ] as const;
    for (const [label, findings] of bad) {
      const top = findings.some((f) => f.risk === "Critical") ? "Critical" : "Low";
      const { error } = await a.rpc("save_scan", {
        p_file_name: "bad-findings.csv",
        p_size_bytes: 50,
        p_file_risk: top,
        p_findings: findings,
      });
      expect(error, `${label} was accepted`).not.toBeNull();
    }
    expect(await countScans(a)).toBe(before);
  });

  it("DB rejects an unmasked example", async () => {
    const before = await countScans(a);
    const { error } = await a.rpc("save_scan", {
      p_file_name: "unmasked-test.csv",
      p_size_bytes: 50,
      p_file_risk: "Critical",
      p_findings: [{ type: "payment_card", risk: "Critical", count: 1, masked_example: "4111*111111111111" }],
    });
    expect(error).not.toBeNull();
    expect(await countScans(a)).toBe(before);
  });
});
