import type { FindingType, Risk } from "../detection/types";
import { isFindingRisk, isFindingType } from "../ui/labels";

export interface FindingFilters {
  type?: FindingType;
  risk?: Exclude<Risk, "None">;
}

type RawParams = Record<string, string | string[] | undefined>;

/** Whitelists URL params; anything unknown is ignored rather than passed to the query. */
export function parseFindingFilters(params: RawParams): FindingFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const type = one(params.type);
  const risk = one(params.risk);
  return {
    ...(isFindingType(type) ? { type } : {}),
    ...(isFindingRisk(risk) ? { risk } : {}),
  };
}

export function buildFindingsHref(filters: FindingFilters): string {
  const qs = new URLSearchParams();
  if (filters.type) qs.set("type", filters.type);
  if (filters.risk) qs.set("risk", filters.risk);
  const s = qs.toString();
  return s ? `/findings?${s}` : "/findings";
}
