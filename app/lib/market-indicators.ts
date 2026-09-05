// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

/** An N-period EMA, seeded with the first N observations' arithmetic mean.
 * Missing observations reset the warm-up; we never invent a price for a gap.
 */
export function exponentialMovingAverage(values: readonly number[], period: number): Array<number | null> {
  if (!Number.isInteger(period) || period < 1) throw new RangeError("EMA period must be a positive integer.");
  const alpha = 2 / (period + 1);
  let sum = 0;
  let count = 0;
  let previous: number | null = null;
  return values.map((value) => {
    if (!Number.isFinite(value)) {
      sum = 0;
      count = 0;
      previous = null;
      return null;
    }
    if (previous === null) {
      sum += value;
      count += 1;
      if (count < period) return null;
      previous = sum / period;
    } else {
      previous += alpha * (value - previous);
    }
    return previous;
  });
}

export function priceDomain(values: readonly number[]): { minimum: number; maximum: number } {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return { minimum: 0, maximum: 1 };
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const value of valid) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const padding = Math.max((maximum - minimum) * 0.12, Math.abs(maximum) * 0.0005, Number.EPSILON);
  return { minimum: minimum - padding, maximum: maximum + padding };
}
