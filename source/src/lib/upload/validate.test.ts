import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, sanitizeFilename, validateUpload } from "./validate";

const FIXTURES = path.resolve(__dirname, "../../../../tests/fixtures/additional");
const fixture = (f: string) => new Uint8Array(readFileSync(path.join(FIXTURES, f)));
const ascii = (n: number) => new Uint8Array(n).fill(0x61);
const utf8 = (s: string) => new TextEncoder().encode(s);

describe("validateUpload", () => {
  it("rejects fixture 28 (empty)", () => {
    expect(validateUpload(fixture("28_empty.txt"), "28_empty.txt")).toEqual({ ok: false, code: "EMPTY" });
  });
  it("rejects fixture 29 (.json)", () => {
    expect(validateUpload(fixture("29_unsupported.json"), "29_unsupported.json")).toEqual({
      ok: false,
      code: "UNSUPPORTED_TYPE",
    });
  });
  it("rejects fixture 30 (oversized)", () => {
    expect(validateUpload(fixture("30_oversized.txt"), "30_oversized.txt")).toEqual({ ok: false, code: "TOO_LARGE" });
  });
  it("accepts exactly 1,048,576 bytes and rejects 1,048,577", () => {
    expect(validateUpload(ascii(MAX_UPLOAD_BYTES), "max.txt").ok).toBe(true);
    expect(validateUpload(ascii(MAX_UPLOAD_BYTES + 1), "over.txt")).toEqual({ ok: false, code: "TOO_LARGE" });
  });
  it("rejects a NUL byte", () => {
    expect(validateUpload(new Uint8Array([0x61, 0x00, 0x62]), "nul.txt")).toEqual({ ok: false, code: "BINARY" });
  });
  it("rejects a high share of control characters", () => {
    expect(validateUpload(new Uint8Array([0x61, 0x01, 0x02, 0x62]), "ctl.txt")).toEqual({ ok: false, code: "BINARY" });
  });
  it("rejects invalid UTF-8 (0xC3 0x28)", () => {
    expect(validateUpload(new Uint8Array([0x61, 0xc3, 0x28, 0x62]), "bad.csv")).toEqual({
      ok: false,
      code: "INVALID_UTF8",
    });
  });
  it("accepts a BOM-prefixed file and strips the BOM", () => {
    const r = validateUpload(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("a,b\n")]), "bom.csv");
    expect(r).toMatchObject({ ok: true, text: "a,b\n", safeName: "bom.csv" });
  });
  it("accepts uppercase .TXT", () => {
    expect(validateUpload(utf8("hello"), "NOTES.TXT")).toMatchObject({ ok: true, safeName: "NOTES.TXT" });
  });
  it("accepts valid multi-byte UTF-8", () => {
    expect(validateUpload(utf8("café – ✓"), "u.txt").ok).toBe(true);
  });
  it.each(["report.exe", "noext", "data.csv.json", "x.Csv.pdf"])("rejects extension of %s", (n) => {
    expect(validateUpload(utf8("x"), n)).toEqual({ ok: false, code: "UNSUPPORTED_TYPE" });
  });
});

describe("sanitizeFilename", () => {
  it.each([
    ["../../x.csv", "x.csv"],
    ["..\\..\\windows\\x.txt", "x.txt"],
    ["/etc/passwd/../a.csv", "a.csv"],
    ["a\u0000b\nc.csv", "abc.csv"],
  ])("%j -> %s", (input, out) => expect(sanitizeFilename(input)).toBe(out));
  it.each(["", "../", "..", ".", "\u0001\u0002", "dir/"])("%j is invalid", (input) => {
    expect(sanitizeFilename(input)).toBeNull();
  });
  it("traversal name is reduced to a safe basename by validateUpload", () => {
    expect(validateUpload(utf8("x"), "../../x.csv")).toMatchObject({ ok: true, safeName: "x.csv" });
  });
  it("caps length at 255 and keeps the extension", () => {
    const n = sanitizeFilename("a".repeat(400) + ".csv")!;
    expect(n.length).toBe(255);
    expect(n.endsWith(".csv")).toBe(true);
  });
  it("rejects a dot-file with no stem", () => {
    expect(validateUpload(utf8("x"), ".csv")).toEqual({ ok: false, code: "INVALID_FILENAME" });
  });
});
