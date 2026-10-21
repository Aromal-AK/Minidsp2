import type { FindingType, Risk } from "./types";

/** Raw candidate span. Internal only: never return these from scan() or persist/log them. */
export interface RawMatch {
  type: FindingType;
  risk: Exclude<Risk, "None">;
  start: number;
  end: number;
  value: string;
}

export const DETECTOR_RISK: Record<FindingType, Exclude<Risk, "None">> = {
  email: "Low",
  uk_phone: "Medium",
  uk_nino: "High",
  payment_card: "Critical",
};

const EMAIL_RE =
  /(?<![\w.%+\-@])[A-Za-z0-9](?:[A-Za-z0-9._%+\-]{0,62}[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}(?![\w@\-])/g;

// 0 or +44 (optional "(0)") then a national number starting 1/2/3/7; single space or hyphen between digits.
const PHONE_RE = /(?<![\w+])(?<!\d[ -])(?:\+44[ -]?(?:\(0\)[ -]?)?|0)([1237](?:[ -]?\d){8,9})(?![ -]?\d)/g;

// Prefix letters exclude D,F,I,Q,U,V (1st) and D,F,I,O,Q,U,V (2nd).
const NINO_RE =
  /(?<![A-Za-z0-9])([A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z])[ \t]{0,3}(\d{2})[ \t]{0,3}(\d{2})[ \t]{0,3}(\d{2})(?:[ \t]{0,3}([A-D]))?(?![A-Za-z0-9])/gi;
const NINO_BAD_PREFIXES = new Set(["BG", "GB", "KN", "NK", "NT", "TN", "ZZ"]);

const CARD_RE = /(?<![\w])(?<!\d[ -])\d(?:[ -]?\d){12,18}(?![ -]?\d)/g;

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");

function collect(
  text: string,
  re: RegExp,
  type: FindingType,
  accept: (m: RegExpExecArray) => boolean = () => true,
): RawMatch[] {
  const out: RawMatch[] = [];
  re.lastIndex = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (accept(m)) {
      out.push({ type, risk: DETECTOR_RISK[type], start: m.index, end: m.index + m[0].length, value: m[0] });
    }
  }
  return out;
}

export function findEmails(text: string): RawMatch[] {
  return collect(text, EMAIL_RE, "email", (m) => !m[0].split("@")[0].includes(".."));
}

export function findPhones(text: string): RawMatch[] {
  return collect(text, PHONE_RE, "uk_phone", (m) => {
    const national = digitsOnly(m[1]);
    // Mobiles (07) and 03 numbers are always 10 national digits; geographic 01/02 may be 9 or 10.
    return national[0] === "7" || national[0] === "3" ? national.length === 10 : true;
  });
}

export function findNinos(text: string): RawMatch[] {
  return collect(text, NINO_RE, "uk_nino", (m) => !NINO_BAD_PREFIXES.has(m[1].toUpperCase()));
}

export function findCards(text: string): RawMatch[] {
  return collect(text, CARD_RE, "payment_card", (m) => luhnValid(digitsOnly(m[0])));
}

/** All candidates with overlaps removed: higher risk claims its characters first. */
export function detectRaw(text: string): RawMatch[] {
  const all = [...findCards(text), ...findNinos(text), ...findPhones(text), ...findEmails(text)];
  const rank = { Low: 1, Medium: 2, High: 3, Critical: 4 } as const;
  all.sort((a, b) => rank[b.risk] - rank[a.risk] || a.start - b.start);
  const kept: RawMatch[] = [];
  for (const c of all) {
    if (!kept.some((k) => c.start < k.end && k.start < c.end)) kept.push(c);
  }
  return kept.sort((a, b) => a.start - b.start);
}
