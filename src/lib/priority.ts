/**
 * The intelligence layer — Relief Priority Index (RPI) + Smart Allocation.
 *
 * This is what turns the app from a CRUD-plus-scoring tool into an actual
 * "Agent": instead of scoring each request once in isolation, the RPI ranks
 * every open request by how urgently the *next rupee* should go there, and the
 * allocator decides how to split a donation across the highest-priority
 * underfunded needs.
 *
 * Every function here is pure and deterministic so the logic is transparent and
 * explainable (important for the FYP defense) and unit-testable without a DB.
 */

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface PriorityInput {
  urgency: Urgency | string;
  familiesAffected: number;
  aiScore?: number; // 0-10 (credibility/severity from Gemini)
  donationRaised?: number; // PKR raised so far
  createdAt: string | Date;
}

// Estimated relief cost per affected family (PKR). A deliberately simple,
// explainable basis for a funding goal instead of a hardcoded flat number.
export const BASE_COST_PER_FAMILY = 15000;

const URGENCY_NEED_MULT: Record<string, number> = { low: 0.8, medium: 1.0, high: 1.2, critical: 1.5 };
const URGENCY_WEIGHT: Record<string, number> = { low: 0.25, medium: 0.5, high: 0.75, critical: 1 };

// RPI component weights (sum = 1). Funding gap carries the most weight because
// it is the core allocation signal — a critical request already 90% funded
// should yield the next donation to an equally critical one sitting at 0%.
export const RPI_WEIGHTS = { gap: 0.3, ai: 0.25, urgency: 0.2, scale: 0.15, age: 0.1 };

/** Estimated total funds needed for a request (PKR), scaled by urgency. */
export function estimatedNeed(input: PriorityInput): number {
  const mult = URGENCY_NEED_MULT[input.urgency] ?? 1;
  return Math.round(Math.max(1, input.familiesAffected) * BASE_COST_PER_FAMILY * mult);
}

export interface FundingGap {
  need: number;
  raised: number;
  remaining: number;
  fundedPct: number; // 0-100
  gapRatio: number; // 0-1 (remaining / need)
}

export function fundingGap(input: PriorityInput): FundingGap {
  const need = estimatedNeed(input);
  const raised = Math.max(0, input.donationRaised || 0);
  const remaining = Math.max(0, need - raised);
  return {
    need,
    raised,
    remaining,
    fundedPct: Math.min(100, Math.round((raised / need) * 100)),
    gapRatio: Math.min(1, remaining / need)
  };
}

function daysSince(date: string | Date): number {
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, (Date.now() - then) / (24 * 60 * 60 * 1000));
}

export interface RPIResult {
  rpi: number; // 0-100
  components: { ai: number; urgency: number; gap: number; scale: number; age: number };
  funding: FundingGap;
}

/**
 * Relief Priority Index (0-100). Higher = the next donation should go here.
 * Combines AI credibility, self-reported urgency, funding gap, scale of need,
 * and how long the request has waited (so genuine needs aren't neglected).
 */
export function computeRPI(input: PriorityInput): RPIResult {
  const funding = fundingGap(input);

  const ai = Math.min(1, Math.max(0, (input.aiScore ?? 5) / 10));
  const urgency = URGENCY_WEIGHT[input.urgency] ?? 0.5;
  const gap = funding.gapRatio;
  // Scale: log-normalized so 1→~0 and ~500 families→~1 (diminishing returns).
  const scale = Math.min(1, Math.log10(1 + Math.max(0, input.familiesAffected)) / Math.log10(1 + 500));
  // Age: linearly ramps to 1 over 14 days of waiting, then saturates.
  const age = Math.min(1, daysSince(input.createdAt) / 14);

  const rpi = Math.round(
    100 *
      (RPI_WEIGHTS.gap * gap +
        RPI_WEIGHTS.ai * ai +
        RPI_WEIGHTS.urgency * urgency +
        RPI_WEIGHTS.scale * scale +
        RPI_WEIGHTS.age * age)
  );

  return {
    rpi,
    components: {
      ai: Math.round(ai * 100),
      urgency: Math.round(urgency * 100),
      gap: Math.round(gap * 100),
      scale: Math.round(scale * 100),
      age: Math.round(age * 100)
    },
    funding
  };
}

/** Attach priority + funding to a request-like object (for API responses). */
export function withPriority<T extends PriorityInput & { _id?: any }>(r: T) {
  const { rpi, components, funding } = computeRPI(r);
  return { ...r, priority: { rpi, components, ...funding } };
}

/** Rank requests by RPI (desc). Non-mutating. */
export function rankByPriority<T extends PriorityInput>(requests: T[]): (T & { rpi: number })[] {
  return requests
    .map((r) => ({ ...r, rpi: computeRPI(r).rpi }))
    .sort((a, b) => b.rpi - a.rpi);
}

export interface Allocation<T> {
  request: T;
  amount: number;
  rpi: number;
  fundedPctAfter: number;
}

/**
 * Smart allocation: split `amount` PKR across the highest-priority underfunded
 * requests, greedily filling each request's remaining need before moving on.
 * If every open need is filled and money is left over, the remainder tops up
 * the single highest-priority request.
 */
export function allocate<T extends PriorityInput & { _id?: any }>(
  amount: number,
  requests: T[]
): Allocation<T>[] {
  const budget = Math.floor(Math.max(0, amount));
  if (budget <= 0) return [];

  const ranked = requests
    .map((r) => ({ r, rpi: computeRPI(r).rpi, funding: fundingGap(r) }))
    .filter((x) => x.funding.remaining > 0)
    .sort((a, b) => b.rpi - a.rpi);

  if (ranked.length === 0) return [];

  const result: Allocation<T>[] = [];
  let left = budget;
  for (const x of ranked) {
    if (left <= 0) break;
    const give = Math.min(left, x.funding.remaining);
    if (give <= 0) continue;
    result.push({
      request: x.r,
      amount: give,
      rpi: x.rpi,
      fundedPctAfter: Math.min(100, Math.round(((x.funding.raised + give) / x.funding.need) * 100))
    });
    left -= give;
  }

  // Surplus beyond all current needs → add to the top-priority allocation.
  if (left > 0 && result.length > 0) {
    result[0].amount += left;
  }
  return result;
}
