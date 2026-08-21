/**
 * Single source of truth for which year a wrap covers.
 *
 * Defaults to the current calendar year at runtime (so a fresh deployment in
 * 2027 produces 2027 wraps without a code change), falling back to the
 * previous year during the Jan–Mar recap season. `WRAP_YEAR` pins it
 * explicitly for deterministic environments and tests.
 */

export function getWrapYear(now: Date = new Date()): number {
  const fromEnv = Number(process.env.WRAP_YEAR);
  if (Number.isInteger(fromEnv) && fromEnv >= 2000 && fromEnv <= 2100) return fromEnv;
  const year = now.getFullYear();
  // During the recap season (Jan–Apr) the "year in review" is last year's.
  return now.getMonth() < 3 ? year - 1 : year;
}

export function isValidWrapYear(value: number): boolean {
  return Number.isInteger(value) && value >= 2000 && value <= 2100;
}