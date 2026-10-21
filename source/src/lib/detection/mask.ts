import type { FindingType } from "./types";

/*
 * Masking rules (output must never contain the raw value):
 *  email        -> first char of local part + "***@" + domain   e.g. a***@example.test
 *  uk_phone     -> "*" per hidden digit + last 3 digits          e.g. ********123
 *  uk_nino      -> first 2 letters (upper-cased) + "******"      e.g. AB******
 *  payment_card -> "*" per hidden digit + last 4 digits          e.g. ************1111
 */
export function mask(type: FindingType, raw: string): string {
  switch (type) {
    case "email": {
      const at = raw.lastIndexOf("@");
      return `${raw[0]}***@${raw.slice(at + 1).toLowerCase()}`;
    }
    case "uk_phone": {
      const d = raw.replace(/\D/g, "");
      return "*".repeat(d.length - 3) + d.slice(-3);
    }
    case "uk_nino":
      return `${raw.slice(0, 2).toUpperCase()}******`;
    case "payment_card": {
      const d = raw.replace(/\D/g, "");
      return "*".repeat(d.length - 4) + d.slice(-4);
    }
  }
}
