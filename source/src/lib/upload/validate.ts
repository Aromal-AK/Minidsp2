export const MAX_UPLOAD_BYTES = 1_048_576;
const MAX_NAME_LENGTH = 255;
const MAX_CONTROL_RATIO = 0.1;

export type UploadErrorCode =
  | "EMPTY"
  | "TOO_LARGE"
  | "INVALID_FILENAME"
  | "UNSUPPORTED_TYPE"
  | "BINARY"
  | "INVALID_UTF8";

export type UploadResult =
  | { ok: true; text: string; safeName: string; sizeBytes: number }
  | { ok: false; code: UploadErrorCode };

export function sanitizeFilename(filename: string): string | null {
  const base = filename.split(/[\\/]/).pop() ?? "";
  let name = base.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim();
  if (name === "" || name === "." || name === "..") return null;
  if (name.length > MAX_NAME_LENGTH) {
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : "";
    name = name.slice(0, MAX_NAME_LENGTH - ext.length) + ext;
  }
  return name;
}

function looksBinary(bytes: Uint8Array): boolean {
  let control = 0;
  for (const b of bytes) {
    if (b === 0) return true;
    // Count C0 controls except tab, LF, FF, CR; plus DEL.
    if ((b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0c && b !== 0x0d) || b === 0x7f) control++;
  }
  return control / bytes.length > MAX_CONTROL_RATIO;
}

/** Server-side upload validation. Client MIME type is deliberately not an input. */
export function validateUpload(bytes: Uint8Array, filename: string): UploadResult {
  if (bytes.length === 0) return { ok: false, code: "EMPTY" };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, code: "TOO_LARGE" };

  const safeName = sanitizeFilename(filename);
  if (!safeName) return { ok: false, code: "INVALID_FILENAME" };
  const ext = /\.([^.]+)$/.exec(safeName)?.[1]?.toLowerCase();
  if (safeName.startsWith(".") && safeName.lastIndexOf(".") === 0) return { ok: false, code: "INVALID_FILENAME" };
  if (ext !== "csv" && ext !== "txt") return { ok: false, code: "UNSUPPORTED_TYPE" };

  if (looksBinary(bytes)) return { ok: false, code: "BINARY" };

  let text: string;
  try {
    // Default ignoreBOM:false strips a leading UTF-8 BOM.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, code: "INVALID_UTF8" };
  }
  return { ok: true, text, safeName, sizeBytes: bytes.length };
}
