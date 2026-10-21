import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { GET } from "./route";

const sb = vi.hoisted(() => ({
  user: { id: "00000000-0000-0000-0000-00000000000a" } as { id: string } | null,
  result: { data: [] as unknown[], error: null as unknown },
  eq: undefined as unknown as Mock<(...args: unknown[]) => void>,
}));

vi.mock("../../../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: sb.user }, error: null }) },
    from: () => {
      const q = {
        select: () => q,
        limit: () => q,
        eq: (...args: unknown[]) => {
          sb.eq(...args);
          return q;
        },
        then: (resolve: (v: unknown) => unknown) => resolve(sb.result),
      };
      return q;
    },
  }),
}));

const FINDING = {
  id: "f1",
  type: "email",
  risk: "Low",
  count: 2,
  masked_example: "a***@example.test",
  scans: { file_name: "mix.csv", created_at: "2026-10-21T08:00:00.000Z" },
};

const call = (qs = "") => GET(new Request(`http://localhost/api/findings/export${qs}`));

beforeEach(() => {
  sb.user = { id: "00000000-0000-0000-0000-00000000000a" };
  sb.result = { data: [FINDING], error: null };
  sb.eq = vi.fn();
});

describe("GET /api/findings/export", () => {
  it("401 without a session and runs no query", async () => {
    sb.user = null;
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('{"error":"UNAUTHENTICATED"}');
    expect(sb.eq).not.toHaveBeenCalled();
  });

  it("returns a CSV attachment with safe, uncached headers", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="findings-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = new Uint8Array(await res.clone().arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // text() would hide the BOM
    const body = await res.text();
    expect(body.startsWith("File,Scanned (UTC),Type,Risk,Count,Masked example\r\n")).toBe(true);
    expect(body).toContain("mix.csv,2026-10-21T08:00:00.000Z,Email,Low,2,a***@example.test");
  });

  it("applies whitelisted filters and ignores anything else", async () => {
    const res = await call("?type=uk_nino&risk=High");
    expect(sb.eq).toHaveBeenCalledWith("type", "uk_nino");
    expect(sb.eq).toHaveBeenCalledWith("risk", "High");
    expect(res.headers.get("content-disposition")).toContain("findings-uk_nino-high-");

    sb.eq.mockClear();
    const bad = await call(`?type=${encodeURIComponent('x" or 1=1')}&risk=None`);
    expect(sb.eq).not.toHaveBeenCalled();
    expect(bad.headers.get("content-disposition")).not.toMatch(/[^\x20-\x7e]|x"/);
  });

  it("returns an empty export (header only) when nothing matches", async () => {
    sb.result = { data: [], error: null };
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.text()).trim().split("\r\n")).toHaveLength(1);
  });

  it("500 with a generic code and no database detail on query failure", async () => {
    sb.result = { data: null as unknown as unknown[], error: { message: "relation findings secret detail" } };
    const res = await call();
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toBe('{"error":"EXPORT_FAILED"}');
    expect(body.includes("secret detail")).toBe(false);
  });
});
