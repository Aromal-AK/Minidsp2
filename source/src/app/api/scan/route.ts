import { scan } from "../../../lib/detection";
import { createClient } from "../../../lib/supabase/server";
import { MAX_UPLOAD_BYTES, validateUpload, type UploadErrorCode } from "../../../lib/upload/validate";

// Node.js runtime is the default (and required) with cacheComponents; POST handlers are never cached.

// Allowance for multipart boundaries/headers around a max-size file.
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

const STATUS: Record<UploadErrorCode | "BAD_REQUEST" | "UNSUPPORTED_MEDIA" | "UNAUTHENTICATED" | "SAVE_FAILED", number> = {
  EMPTY: 400,
  INVALID_FILENAME: 400,
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  TOO_LARGE: 413,
  UNSUPPORTED_TYPE: 415,
  BINARY: 415,
  INVALID_UTF8: 415,
  UNSUPPORTED_MEDIA: 415,
  SAVE_FAILED: 500,
};

const fail = (code: keyof typeof STATUS) => Response.json({ error: code }, { status: STATUS[code] });

/** Reads the body into memory, aborting as soon as it exceeds the cap. */
async function readCapped(body: ReadableStream<Uint8Array>, cap: number): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) return fail("UNSUPPORTED_MEDIA");

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("TOO_LARGE");
  if (!request.body) return fail("BAD_REQUEST");

  const raw = await readCapped(request.body, MAX_BODY_BYTES);
  if (!raw) return fail("TOO_LARGE");

  let form: FormData;
  try {
    form = await new Response(raw as BodyInit, { headers: { "content-type": contentType } }).formData();
  } catch {
    return fail("BAD_REQUEST");
  }

  const files = [...form.values()].filter((v): v is File => typeof v !== "string");
  if (files.length !== 1) return fail("BAD_REQUEST");
  const file = files[0];
  if (file.size > MAX_UPLOAD_BYTES) return fail("TOO_LARGE");

  const result = validateUpload(new Uint8Array(await file.arrayBuffer()), file.name);
  if (!result.ok) return fail(result.code);

  const { fileRisk, findings } = scan(result.text);
  const { data: scanId, error } = await supabase.rpc("save_scan", {
    p_file_name: result.safeName,
    p_size_bytes: result.sizeBytes,
    p_file_risk: fileRisk,
    p_findings: findings.map((f) => ({ type: f.type, risk: f.risk, count: f.count, masked_example: f.maskedExample })),
  });
  if (error || typeof scanId !== "string") return fail("SAVE_FAILED");

  return Response.json({ scanId, safeName: result.safeName, sizeBytes: result.sizeBytes, fileRisk, findings });
}
