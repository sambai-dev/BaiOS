// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";
import {
  add,
  angleDegrees,
  cross,
  distance,
  dot,
  evaluateMission,
  magnitude,
  missionDefinitions,
  projection,
  scale,
  type Vector3,
} from "./vector-lab-math";

describe("vector relationships", () => {
  it("combines movement in all three axes without changing either input", () => {
    const a: Vector3 = [2, -3, 1];
    const b: Vector3 = [-1, 4, 2];
    expect(add(a, b)).toEqual([1, 1, 3]);
    expect(scale(a, -2)).toEqual([-4, 6, -2]);
    expect(a).toEqual([2, -3, 1]);
    expect(b).toEqual([-1, 4, 2]);
    expect(magnitude([3, 4, 12])).toBe(13);
    expect(distance(a, b)).toBeCloseTo(Math.sqrt(59));
  });

  it("distinguishes parallel, reversed, and perpendicular directions", () => {
    expect(dot([2, 1, 0], [-2, -1, 0])).toBe(-5);
    expect(angleDegrees([2, 1, 0], [4, 2, 0])).toBeCloseTo(0);
    expect(angleDegrees([2, 1, 0], [-2, -1, 0])).toBeCloseTo(180);
    expect(angleDegrees([2, 1, 0], [-1, 2, 0])).toBeCloseTo(90);
    expect(angleDegrees([0, 0, 0], [1, 2, 3])).toBeNull();
    expect(angleDegrees([1, 2, 3], [0, 0, 0])).toBeNull();
  });

  it("projects onto an axis regardless of guide length and retains reverse force", () => {
    const a: Vector3 = [3, 1, 2];
    const projected = projection(a, [2, 1, 0]);
    expect(projected[0]).toBeCloseTo(2.8);
    expect(projected[1]).toBeCloseTo(1.4);
    expect(projected[2]).toBe(0);
    expect(distance(projected, projection(a, [20, 10, 0]))).toBeCloseTo(0);
    expect(dot(add(a, scale(projected, -1)), [2, 1, 0])).toBeCloseTo(0);
    expect(projection([-3, 2, 0], [1, 0, 0])).toEqual([-3, -0, -0]);
    expect(projection(a, [0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("uses the right-hand rule and produces no cross force from parallel vectors", () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(cross([0, 1, 0], [1, 0, 0])).toEqual([0, 0, -1]);
    expect(cross([1, 2, 3], [2, 4, 6])).toEqual([0, 0, 0]);
    const a: Vector3 = [2, -1, 4];
    const b: Vector3 = [3, 2, -2];
    expect(dot(cross(a, b), a)).toBe(0);
    expect(dot(cross(a, b), b)).toBe(0);
  });
});

describe("vector missions", () => {
  it("starts every challenge unsolved and presents all three lessons plus exploration", () => {
    expect(missionDefinitions.map((mission) => mission.id)).toEqual(["dock", "thrust", "lift", "explore"]);
    for (const mission of missionDefinitions) {
      const result = evaluateMission(mission.id, mission.initialA, mission.initialB);
      expect(result.success).toBe(false);
      expect(result.score).toBeLessThan(100);
    }
  });

  it("accepts different thruster pairs that dock at the same target", () => {
    for (const [a, b] of [
      [[2, 0, 0], [0, 1, 0]],
      [[-1, 4, 2], [3, -3, -2]],
    ] as [Vector3, Vector3][]) {
      expect(evaluateMission("dock", a, b)).toMatchObject({
        output: [2, 1, 0], target: [2, 1, 0], error: 0, success: true, score: 100,
      });
    }
    expect(evaluateMission("dock", [2.25, 1, 0], [0, 0, 0]).success).toBe(true);
    expect(evaluateMission("dock", [2.251, 1, 0], [0, 0, 0]).success).toBe(false);
  });

  it("requires both thrust direction and strength, including sideways waste", () => {
    const guide: Vector3 = [2, 1, 0];
    expect(evaluateMission("thrust", guide, guide)).toMatchObject({ success: true, score: 100 });
    const sideways = evaluateMission("thrust", [1, 3, 0], guide);
    expect(distance(sideways.output, guide)).toBeCloseTo(0);
    expect(sideways.success).toBe(false);
    expect(sideways.error).toBeCloseTo(Math.sqrt(5));
    expect(evaluateMission("thrust", [0.2, 0.1, 0], guide).success).toBe(false);
    expect(evaluateMission("thrust", [-2, -1, 0], guide)).toMatchObject({
      success: false, feedback: expect.stringContaining("Reverse thrust"),
    });
    expect(evaluateMission("thrust", guide, [0, 0, 0]).success).toBe(false);
    expect(evaluateMission("thrust", [0, 0, 0], guide).success).toBe(false);
  });

  it("creates lift with the correct cross-product sign and tolerates irrelevant Z changes", () => {
    expect(evaluateMission("lift", [-1.5, 0, 0], [0, 0, 2])).toMatchObject({
      output: [0, 3, -0], success: true, score: 100,
    });
    expect(evaluateMission("lift", [-1.5, 0, 3], [0, 0, 2]).success).toBe(true);
    expect(evaluateMission("lift", [1.5, 0, 0], [0, 0, 2])).toMatchObject({
      success: false, feedback: expect.stringContaining("downward"),
    });
    expect(evaluateMission("lift", [0, 0, 3], [0, 0, 2])).toMatchObject({
      success: false, feedback: expect.stringContaining("Parallel"),
    });
    expect(evaluateMission("lift", [-1.35, 0, 0], [0, 0, 2]).success).toBe(true);
  });

  it("rewards getting closer without calling a near miss complete", () => {
    const far = evaluateMission("dock", [-2, 0, 0], [0, 0, 0]);
    const closer = evaluateMission("dock", [1, 1, 0], [0, 0, 0]);
    const near = evaluateMission("dock", [1.74, 1, 0], [0, 0, 0]);
    expect(far.score).toBeLessThan(closer.score);
    expect(closer.score).toBeLessThan(near.score);
    expect(near.score).toBeLessThan(100);
    expect(near.success).toBe(false);
    expect(evaluateMission("dock", [100, 100, 100], [0, 0, 0]).score).toBe(0);
  });

  it("keeps free exploration unscored even when the sum happens to equal a mission target", () => {
    expect(evaluateMission("explore", [2, 0, 0], [0, 1, 0])).toMatchObject({
      output: [2, 1, 0], success: false, score: 0, error: 0,
    });
  });
});
