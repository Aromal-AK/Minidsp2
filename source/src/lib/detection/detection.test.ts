import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectRaw, luhnValid } from "./detectors";
import { scan } from "./index";

const FIXTURES = path.resolve(__dirname, "../../../../tests/fixtures/additional");

const types = (text: string) => scan(text).findings.map((f) => f.type);

function expectNoRawValues(text: string) {
  const json = JSON.stringify(scan(text));
  for (const m of detectRaw(text)) {
    // Boolean asserts so a failure never prints the raw value.
    const compact = m.value.replace(/[\s-]/g, "").toLowerCase();
    expect(json.includes(m.value), `raw ${m.type} leaked`).toBe(false);
    expect(json.toLowerCase().includes(compact), `raw ${m.type} leaked`).toBe(false);
  }
}

describe("email (Low)", () => {
  it("detects and masks a plausible email", () => {
    const r = scan("contact alex@example.test today");
    expect(r.fileRisk).toBe("Low");
    expect(r.findings).toEqual([{ type: "email", risk: "Low", count: 1, maskedExample: "a***@example.test" }]);
  });
  it.each(["alex@@example.test", "alex@example", "@example.test", "alex..b@example.test", "alex@.example.test"])(
    "ignores malformed %s",
    (v) => expect(scan(v).fileRisk).toBe("None"),
  );
});

describe("UK phone (Medium)", () => {
  it.each(["07700 900123", "+44 7700 900123", "07700900123", "+447700900123", "020 7946 0018", "0113 496 0000"])(
    "detects %s",
    (v) => {
      const r = scan(`call ${v} now`);
      expect(r.fileRisk).toBe("Medium");
      expect(r.findings[0].type).toBe("uk_phone");
      expect(r.findings[0].maskedExample).toMatch(/^\*+\d{3}$/);
    },
  );
  it("masks to last 3 digits", () => {
    expect(scan("07700 900123").findings[0].maskedExample).toBe("********123");
  });
  it.each(["07700-900123", "+44-7700-900123", "+44 (0)7700-900-123", "020-7946-0018"])("detects hyphenated %s", (v) => {
    const d = v.replace(/\D/g, "");
    expect(scan(`tel: ${v}.`).findings).toEqual([
      expect.objectContaining({ type: "uk_phone", count: 1, maskedExample: "*".repeat(d.length - 3) + d.slice(-3) }),
    ]);
  });
  it.each(["07700-900123-4", "9-07700-900123", "07700--900123", "07700-9001", "+44-7700-900123-99"])(
    "ignores hyphenated near-miss %s",
    (v) => expect(types(v)).not.toContain("uk_phone"),
  );
  it("hyphenated card is not counted as a phone", () => {
    const body = "07700900123000";
    const check = [..."0123456789"].find((d) => luhnValid(body + d))!;
    expect(types(`${body}${check}`.replace(/(\d{4})(?=\d)/g, "$1-"))).toEqual(["payment_card"]);
  });
  it.each(["12345", "077009001234567", "9907700900123", "0770 090", "+1 7700 900123"])("ignores %s", (v) =>
    expect(types(v)).not.toContain("uk_phone"),
  );
});

describe("UK NINO (High)", () => {
  it.each(["AB 12 34 56 C", "AB123456C", "ab123456c", "AB 123456", "AB123456"])("detects %s", (v) => {
    const r = scan(`ref ${v} end`);
    expect(r.fileRisk).toBe("High");
    expect(r.findings[0]).toMatchObject({ type: "uk_nino", count: 1, maskedExample: "AB******" });
  });
  it.each(["DA 12 34 56 C", "AO 12 34 56 C", "GB 12 34 56 C", "ZZ123456A", "AB 12 34 5 C", "AB123456E", "XAB123456C"])(
    "ignores malformed %s",
    (v) => expect(types(v)).not.toContain("uk_nino"),
  );
});

describe("payment card (Critical)", () => {
  it("detects a Luhn-valid test card", () => {
    const r = scan("card 4111 1111 1111 1111 exp");
    expect(r.fileRisk).toBe("Critical");
    expect(r.findings).toEqual([
      { type: "payment_card", risk: "Critical", count: 1, maskedExample: "************1111" },
    ]);
  });
  it("detects hyphenated and compact forms", () => {
    expect(scan("4111-1111-1111-1111").fileRisk).toBe("Critical");
    expect(scan("5555555555554444").fileRisk).toBe("Critical");
  });
  it("rejects Luhn failure (last digit 2)", () => {
    expect(scan("4111 1111 1111 1112").fileRisk).toBe("None");
  });
  it("rejects too short / too long runs and partial matches", () => {
    expect(scan("411111111111").fileRisk).toBe("None"); // 12 digits
    expect(types("41111111111111111111")).not.toContain("payment_card"); // 20 digits
    expect(types("X4111111111111111")).not.toContain("payment_card");
  });
  it("luhnValid", () => {
    expect(luhnValid("4111111111111111")).toBe(true);
    expect(luhnValid("4111111111111112")).toBe(false);
  });
});

describe("classification, aggregation and overlaps", () => {
  it("clean text -> None", () => {
    expect(scan("Inventory: 3 widgets, order 12345, shipped Monday.")).toEqual({ fileRisk: "None", findings: [] });
  });
  it("counts repeated matches", () => {
    const r = scan("alex@example.test, alex@example.test; 4111 1111 1111 1111 and 4111-1111-1111-1111");
    expect(r.findings.find((f) => f.type === "email")?.count).toBe(2);
    expect(r.findings.find((f) => f.type === "payment_card")?.count).toBe(2);
  });
  it("mixed file -> Critical with all four types, sorted by risk", () => {
    const r = scan("alex@example.test,07700 900123,AB 12 34 56 C,4111 1111 1111 1111");
    expect(r.fileRisk).toBe("Critical");
    expect(r.findings.map((f) => f.type)).toEqual(["payment_card", "uk_nino", "uk_phone", "email"]);
  });
  it("card digits are not also counted as a phone", () => {
    const body = "07700900123000";
    const check = [..."0123456789"].find((d) => luhnValid(body + d))!;
    const card = `${body}${check}`.replace(/(\d{4})(?=\d)/g, "$1 ");
    expect(types(card)).toEqual(["payment_card"]);
  });
});

describe("performance / ReDoS guard (~1 MiB adversarial input, < 2 s each)", () => {
  const MiB = 1024 * 1024;
  const fill = (unit: string) => unit.repeat(Math.ceil(MiB / unit.length)).slice(0, MiB);
  it.each([
    ["long digit run", fill("7")],
    ["digits separated by single spaces", fill("7 ")],
    ["digits separated by single hyphens", fill("0-")],
    ["a.a.a.a with no @", fill("a.")],
    ["many @ characters", fill("a@")],
    ["many @ and dots", fill("a@a.")],
    ["near-miss NINO", fill("AB 12 34 5 ")],
    ["near-miss card/phone groups", fill("0770 0900 12 ")],
  ])("%s", (_name, text) => {
    const t0 = performance.now();
    scan(text);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(2000);
  });
});

describe("no raw values in output", () => {
  it("acceptance values never appear in the JSON result", () => {
    expectNoRawValues(
      "alex@example.test 07700 900123 +44 7700 900123 AB 12 34 56 C 4111 1111 1111 1111 ab123456c",
    );
  });
});

describe("fixtures/additional", () => {
  const expected: { file: string; expected_file_risk: string }[] = JSON.parse(
    readFileSync(path.join(FIXTURES, "EXPECTED_RESULTS.json"), "utf8"),
  );
  // Upload-validation fixtures (empty / unsupported / oversized) are covered by upload tests, not the scanner.
  const scannable = expected.filter((e) => e.expected_file_risk !== "Reject");
  it.skip.each(expected.filter((e) => e.expected_file_risk === "Reject").map((e) => e.file))(
    "skipped (upload-validation fixture): %s",
    () => {},
  );
  it.each(scannable)("$file -> $expected_file_risk", ({ file, expected_file_risk }) => {
    const text = readFileSync(path.join(FIXTURES, file), "utf8");
    expect(scan(text).fileRisk).toBe(expected_file_risk);
    expectNoRawValues(text);
  });
});
