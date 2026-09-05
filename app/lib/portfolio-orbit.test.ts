// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";
import { createOrbitPath, getOrbitPoint } from "./portfolio-projects";

type Point = { x: number; y: number };
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

describe("portfolio orbit geometry", () => {
  it("closes the path and wraps progress in either direction without a seam", () => {
    const path = createOrbitPath(1440, 900);
    for (const progress of [0, 0.125, 0.73, 0.999]) {
      const point = getOrbitPoint(path, progress);
      for (const cycles of [-3, -1, 1, 4]) {
        const wrapped = getOrbitPoint(path, progress + cycles);
        expect(wrapped.x).toBeCloseTo(point.x, 8);
        expect(wrapped.y).toBeCloseTo(point.y, 8);
        expect(wrapped.scale).toBeCloseTo(point.scale, 8);
        expect(wrapped.tangentX).toBeCloseTo(point.tangentX, 8);
        expect(wrapped.tangentY).toBeCloseTo(point.tangentY, 8);
      }
    }
  });

  it("moves at constant pixel speed through the narrow and wide parts of the desktop ellipse", () => {
    const path = createOrbitPath(1440, 900);
    const steps = 1024;
    const distances = Array.from({ length: steps }, (_, index) => distance(
      getOrbitPoint(path, index / steps),
      getOrbitPoint(path, (index + 1) / steps),
    ));

    // Uniform angle stepping on an ellipse fails this: its speed changes with curvature.
    expect(Math.max(...distances) / Math.min(...distances)).toBeLessThan(1.01);
    expect(distances.reduce((total, step) => total + step, 0)).toBeCloseTo(path.length, 0);
  });

  it("gives eight evenly phased cards equal travel distance around the path", () => {
    const path = createOrbitPath(1440, 900);
    const cardCount = 8;
    const samplesPerGap = 128;
    const gaps = Array.from({ length: cardCount }, (_, card) => {
      let length = 0;
      for (let sample = 0; sample < samplesPerGap; sample += 1) {
        const progress = (card + sample / samplesPerGap) / cardCount;
        length += distance(
          getOrbitPoint(path, progress),
          getOrbitPoint(path, progress + 1 / (samplesPerGap * cardCount)),
        );
      }
      return length;
    });

    // Compare distance along the curve; straight chords differ with ellipse curvature.
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.01);
    for (const gap of gaps) {
      expect(Math.abs(gap / (path.length / cardCount) - 1)).toBeLessThan(0.01);
    }
  });

  it("remains usable before the stage has a measured size", () => {
    const path = createOrbitPath(0, 0);
    expect(path.length).toBeGreaterThan(0);
    for (const progress of [-0.5, 0, 0.25, 0.999, 1]) {
      const point = getOrbitPoint(path, progress);
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(Math.hypot(point.tangentX, point.tangentY)).toBeCloseTo(1, 6);
    }
  });

  it.each([
    { width: 1296, height: 672, cardWidth: 196, centerX: 0.54 },
    { width: 880, height: 590, cardWidth: 146, centerX: 0.54 },
    { width: 355, height: 560, cardWidth: 94, centerX: 0.5 },
    { width: 285, height: 560, cardWidth: 84, centerX: 0.5 },
  ])("keeps eight 3:2 cards separated throughout a lap on a $width × $height stage", ({ width, height, cardWidth, centerX }) => {
    const path = createOrbitPath(width, height);
    for (let step = 0; step < 1024; step += 1) {
      const cards = Array.from({ length: 8 }, (_, index) => getOrbitPoint(path, step / 1024 + index / 8));
      for (const [index, card] of cards.entries()) {
        const renderedWidth = cardWidth * card.scale;
        const renderedHeight = renderedWidth / 1.5;
        expect(width * centerX + card.x - renderedWidth / 2).toBeGreaterThanOrEqual(0);
        expect(width * centerX + card.x + renderedWidth / 2).toBeLessThanOrEqual(width);
        if (width < 621) {
          // The mobile orbit sits at 42%; leave the lower 76px for the heading.
          expect(height * 0.42 + card.y - renderedHeight / 2).toBeGreaterThanOrEqual(0);
          expect(height * 0.42 + card.y + renderedHeight / 2).toBeLessThanOrEqual(height - 76);
        }
        for (const other of cards.slice(index + 1)) {
          const horizontalGap = Math.abs(card.x - other.x) - renderedWidth;
          const verticalGap = Math.abs(card.y - other.y) - renderedHeight;
          expect(Math.max(horizontalGap, verticalGap)).toBeGreaterThanOrEqual(8);
        }
      }
    }
  });

  it.each([[1440, 900], [390, 560], [320, 480]])(
    "keeps the %i × %i path finite, centered, and inside the stage with usable tangents",
    (width, height) => {
      const path = createOrbitPath(width, height);
      const points = Array.from({ length: 256 }, (_, index) => getOrbitPoint(path, index / 256));
      expect(Number.isFinite(path.length)).toBe(true);
      expect(path.length).toBeGreaterThan(width);

      for (const [index, point] of points.entries()) {
        for (const value of [point.x, point.y, point.scale, point.tangentX, point.tangentY]) {
          expect(Number.isFinite(value)).toBe(true);
        }
        expect(Math.abs(point.x)).toBeLessThan(width / 2);
        expect(Math.abs(point.y)).toBeLessThan(height / 2);
        expect(point.scale).toBeGreaterThan(0.5);
        expect(point.scale).toBeLessThan(1.5);
        expect(Math.hypot(point.tangentX, point.tangentY)).toBeCloseTo(1, 6);

        const next = getOrbitPoint(path, index / 256 + 0.0001);
        const step = distance(point, next);
        const forwardAlignment = ((next.x - point.x) * point.tangentX + (next.y - point.y) * point.tangentY) / step;
        expect(forwardAlignment).toBeGreaterThan(0.995);
      }

      // Prevent an accidentally collapsed path from satisfying the bounds checks.
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(width * 0.3);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(height * 0.25);
      expect(Math.max(...xs)).toBeCloseTo(-Math.min(...xs), 6);
      expect(Math.max(...ys)).toBeCloseTo(-Math.min(...ys), 6);
    },
  );
});
