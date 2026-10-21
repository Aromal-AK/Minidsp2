import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const sb = vi.hoisted(() => ({
  user: { id: "00000000-0000-0000-0000-00000000000a" } as { id: string } | null,
  rpcResult: { data: "11111111-1111-1111-1111-111111111111" as unknown, error: null as unknown },
  rpc: undefined as unknown as ReturnType<typeof import("vitest").vi.fn>,
}));

vi.mock("../../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: sb.user }, error: null }) },
    rpc: sb.rpc,
  }),
}));

beforeEach(() => {
  sb.user = { id: "00000000-0000-0000-0000-00000000000a" };
  sb.rpcResult = { data: "11111111-1111-1111-1111-111111111111", error: null };
  sb.rpc = vi.fn(async () => sb.rpcResult);
});

const FIXTURES = path.resolve(__dirname, "../../../../../tests/fixtures");
const read = (rel: string) => new Uint8Array(readFileSync(path.join(FIXTURES, rel)));

function upload(bytes: Uint8Array, name: string, type = "text/plain"): Request {
  const form = new FormData();
  form.append("file", new File([bytes as BlobPart], name, { type }));
  return new Request("http://localhost/api/scan", { method: "POST", body: form });
}

const ERROR_BODY = /^\{"error":"[A-Z0-9_]+"\}$/;

async function expectSafeError(res: Response, status: number, content: Uint8Array) {
  expect(res.status).toBe(status);
  const body = await res.text();
  expect(body).toMatch(ERROR_BODY);
  const text = new TextDecoder().decode(content).trim();
  // Boolean assert so a failure never prints file content.
  if (text.length > 0) expect(body.includes(text.slice(0, 20)), "file content leaked").toBe(false);
}

describe("POST /api/scan — auth and persistence", () => {
  it("401 without a session and the body is never read", async () => {
    sb.user = null;
    let pulled = false;
    const body = new ReadableStream(
      {
        pull() {
          pulled = true;
        },
      },
      // highWaterMark 0: pull() only fires when a consumer actually reads.
      { highWaterMark: 0 },
    );
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body,
      duplex: "half",
    } as RequestInit);
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('{"error":"UNAUTHENTICATED"}');
    expect(req.bodyUsed).toBe(false);
    expect(pulled).toBe(false);
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["empty", new Uint8Array(0), "e.txt"],
    ["unsupported", new TextEncoder().encode("alex@example.test"), "a.json"],
    ["binary", new Uint8Array([0x61, 0x00]), "b.txt"],
    ["invalid utf-8", new Uint8Array([0xc3, 0x28]), "c.csv"],
  ])("rejected upload (%s) makes no RPC call", async (_n, bytes, name) => {
    const res = await POST(upload(bytes, name));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it("RPC payload contains only masked, aggregated findings (no raw values)", async () => {
    const raws = ["alex@example.test", "07700 900123", "07700900123", "AB 12 34 56 C", "AB123456C", "4111 1111 1111 1111", "4111111111111111"];
    const text = "alex@example.test,07700 900123,AB 12 34 56 C,4111 1111 1111 1111,alex@example.test";
    const res = await POST(upload(new TextEncoder().encode(text), "mix.csv"));
    expect(res.status).toBe(200);
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = sb.rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(fn).toBe("save_scan");
    expect(Object.keys(args).sort()).toEqual(["p_file_name", "p_file_risk", "p_findings", "p_size_bytes"]);
    const payload = JSON.stringify(args);
    for (const r of raws) expect(payload.includes(r), "raw value in RPC payload").toBe(false);
    expect(args.p_findings).toHaveLength(4);
    expect((args.p_findings as { type: string; count: number }[]).find((f) => f.type === "email")?.count).toBe(2);
    const resBody = await res.text();
    for (const r of raws) expect(resBody.includes(r), "raw value in response").toBe(false);
  });

  it("generic 500 when the save fails", async () => {
    sb.rpcResult = { data: null, error: { message: "violates check constraint findings_masked_example_check", code: "23514" } };
    const res = await POST(upload(new TextEncoder().encode("alex@example.test"), "a.txt"));
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('{"error":"SAVE_FAILED"}');
  });
});

describe("POST /api/scan", () => {
  it("scans sample-mixed.txt -> Critical with masked findings only", async () => {
    const bytes = read("sample-mixed.txt");
    const res = await POST(upload(bytes, "sample-mixed.txt"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Object.keys(json).sort()).toEqual(["fileRisk", "findings", "safeName", "scanId", "sizeBytes"]);
    expect(json).toMatchObject({
      scanId: "11111111-1111-1111-1111-111111111111",
      safeName: "sample-mixed.txt",
      sizeBytes: bytes.length,
      fileRisk: "Critical",
    });
    expect(sb.rpc).toHaveBeenCalledTimes(1);
  });

  it("scans sample-safe.txt", async () => {
    const res = await POST(upload(read("sample-safe.txt"), "sample-safe.txt"));
    expect(res.status).toBe(200);
  });

  it("sanitises a traversal filename", async () => {
    const res = await POST(upload(new TextEncoder().encode("hello"), "../../x.csv"));
    expect((await res.json()).safeName).toBe("x.csv");
  });

  it("400 for empty fixture 28", async () => {
    const bytes = read("additional/28_empty.txt");
    await expectSafeError(await POST(upload(bytes, "28_empty.txt")), 400, bytes);
  });

  it("415 for .json fixture 29 even with a text/csv MIME hint", async () => {
    const bytes = read("additional/29_unsupported.json");
    await expectSafeError(await POST(upload(bytes, "29_unsupported.json", "text/csv")), 415, bytes);
  });

  it("413 for oversized fixture 30", async () => {
    const bytes = read("additional/30_oversized.txt");
    await expectSafeError(await POST(upload(bytes, "30_oversized.txt")), 413, bytes);
  });

  it("413 from Content-Length before reading the body", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": "99999999" },
      body: "--x--",
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(await res.text()).toMatch(ERROR_BODY);
  });

  it("415 for binary content", async () => {
    const bytes = new Uint8Array([0x73, 0x65, 0x63, 0x72, 0x65, 0x74, 0x00, 0x01]);
    await expectSafeError(await POST(upload(bytes, "bin.txt")), 415, bytes);
  });

  it("415 for invalid UTF-8", async () => {
    const bytes = new Uint8Array([0x61, 0x6c, 0x65, 0x78, 0xc3, 0x28]);
    await expectSafeError(await POST(upload(bytes, "bad.csv")), 415, bytes);
  });

  it("415 for a non-multipart request", async () => {
    const res = await POST(
      new Request("http://localhost/api/scan", { method: "POST", headers: { "content-type": "text/plain" }, body: "alex@example.test" }),
    );
    expect(res.status).toBe(415);
    expect(await res.text()).not.toContain("alex");
  });

  it("400 when no file or more than one file is sent", async () => {
    const none = new FormData();
    none.append("note", "x");
    expect((await POST(new Request("http://localhost/api/scan", { method: "POST", body: none }))).status).toBe(400);

    const two = new FormData();
    two.append("file", new File(["a"], "a.txt"));
    two.append("file2", new File(["b"], "b.txt"));
    expect((await POST(new Request("http://localhost/api/scan", { method: "POST", body: two }))).status).toBe(400);
  });
});
