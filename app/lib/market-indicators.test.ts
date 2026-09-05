// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";
import { exponentialMovingAverage, priceDomain } from "./market-indicators";

describe("exponential moving averages", () => {
  it("waits for a complete period, seeds with its mean, then weights newer observations", () => {
    expect(exponentialMovingAverage([10, 12, 14, 20, 16], 3)).toEqual([null, null, 12, 16, 16]);
  });
  it("does not draw a misleading EMA when history is shorter than the requested period", () => {
    expect(exponentialMovingAverage([10, 12, 14], 20)).toEqual([null, null, null]);
  });
  it("resets warm-up after a missing observation rather than interpolating a price", () => {
    expect(exponentialMovingAverage([2, 4, NaN, 10, 12, 20], 2)).toEqual([null, 3, null, null, 11, 17]);
  });
  it("a one-period average follows the supplied prices exactly", () => {
    expect(exponentialMovingAverage([0.01, 0.02, 0.03], 1)).toEqual([0.01, 0.02, 0.03]);
  });
  it("uses the correct smoothing constants for the 20- and 50-period overlays", () => {
    for (const period of [20, 50]) {
      const result = exponentialMovingAverage([...Array<number>(period).fill(100), 121], period);
      expect(result[period - 1]).toBe(100);
      expect(result[period]).toBeCloseTo(100 + 21 * 2 / (period + 1), 12);
    }
  });
  it("rejects ambiguous fractional or nonpositive periods", () => {
    for (const period of [0, -1, 2.5, Infinity]) expect(() => exponentialMovingAverage([1, 2], period)).toThrow(RangeError);
  });
});

describe("price chart scale", () => {
  it("preserves visible variation in low-price assets", () => {
    const domain = priceDomain([0.01, 0.011, 0.012]);
    expect(domain.minimum).toBeLessThan(0.01);
    expect(domain.maximum).toBeGreaterThan(0.012);
    expect(domain.maximum - domain.minimum).toBeLessThan(0.003);
  });
  it("gives a constant price a finite, nonzero plotting range", () => {
    const domain = priceDomain([100, 100, 100]);
    expect(domain.maximum).toBeGreaterThan(domain.minimum);
    expect((domain.maximum + domain.minimum) / 2).toBe(100);
  });
});
