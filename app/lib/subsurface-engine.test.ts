// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";

import {
  createDive,
  DIVE_GATE_COUNT,
  GATE_HALF_WIDTH,
  SUB_RADIUS_X,
  SUB_RADIUS_Y,
  SUB_X,
  stepDive,
  activateSonar,
  type DiveModel,
} from "./subsurface-engine";

const released = { rise: false, dive: false };

function passGate(model: DiveModel, index: number) {
  model.gates[index]!.x = SUB_X - SUB_RADIUS_X - GATE_HALF_WIDTH - 0.001;
  stepDive(model, released, 0);
}

function collectSample(model: DiveModel, index: number) {
  const gate = model.gates[index]!;
  gate.x = SUB_X;
  model.y = gate.center;
  stepDive(model, released, 0);
}

describe("Subsurface expedition", () => {
  it("replays a seeded route and varies a different seed", () => {
    expect(createDive(731)).toEqual(createDive(731));
    expect(createDive(42).gates).not.toEqual(createDive(731).gates);
  });

  it("keeps every generated opening inside the water and consecutive openings reachable", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const { gates } = createDive(seed);
      expect(gates).toHaveLength(DIVE_GATE_COUNT);
      expect(new Set(gates.map((gate) => gate.id)).size).toBe(DIVE_GATE_COUNT);
      for (const [index, gate] of gates.entries()) {
        expect(gate.center - gate.halfGap).toBeGreaterThanOrEqual(0.06);
        expect(gate.center + gate.halfGap).toBeLessThanOrEqual(0.94);
        expect(gate.halfGap).toBeGreaterThan(SUB_RADIUS_Y);
        if (index === 0) continue;
        expect(gate.x).toBeGreaterThan(gates[index - 1]!.x);
        expect(Math.abs(gate.center - gates[index - 1]!.center)).toBeLessThanOrEqual(0.160000001);
      }
    }
  });

  it.each([1, 7, 42, 731, 4294967295])("can finish seed %i through normal steering without taking damage", (seed) => {
    const model = createDive(seed);
    for (let frame = 0; frame < 4000 && model.outcome === "playing"; frame += 1) {
      const nextGate = model.gates.find((gate) => !gate.passed);
      if (!nextGate) break;
      const rise = model.y + model.velocity * 0.2 > nextGate.center;
      stepDive(model, { rise, dive: !rise }, 1 / 60);
    }
    expect(model.outcome).toBe("complete");
    expect(model.passed).toBe(DIVE_GATE_COUNT);
    expect(model.hull).toBe(3);
  });

  it("uses the visible opening and submarine radii as the collision boundary", () => {
    const safe = createDive();
    const safeGate = safe.gates[0]!;
    safeGate.x = SUB_X;
    safe.y = safeGate.center + safeGate.halfGap - SUB_RADIUS_Y - 0.000001;
    stepDive(safe, released, 0);
    expect(safe.hull).toBe(3);

    const touchingWall = createDive();
    const blockedGate = touchingWall.gates[0]!;
    blockedGate.x = SUB_X;
    touchingWall.y = blockedGate.center + blockedGate.halfGap - SUB_RADIUS_Y + 0.000001;
    stepDive(touchingWall, released, 0);
    expect(touchingWall.hull).toBe(2);

    const beyondWall = createDive();
    beyondWall.gates[0]!.x = SUB_X + GATE_HALF_WIDTH + SUB_RADIUS_X + 0.000001;
    beyondWall.y = touchingWall.y;
    stepDive(beyondWall, released, 0);
    expect(beyondWall.hull).toBe(3);
  });

  it("gives a grace period after damage instead of consuming the entire hull in consecutive frames", () => {
    const model = createDive();
    model.gates = [];
    model.y = 0.01;
    model.velocity = -0.28;
    model.combo = 4;
    stepDive(model, { rise: true, dive: false }, 1 / 30);
    expect(model.hull).toBe(2);
    expect(model.combo).toBe(0);
    expect(model.shield).toBe(true);
    for (let frame = 0; frame < 30; frame += 1) {
      stepDive(model, { rise: true, dive: false }, 1 / 30);
    }
    expect(model.hull).toBe(2);
    for (let frame = 0; frame < 30; frame += 1) {
      stepDive(model, { rise: true, dive: false }, 1 / 30);
    }
    expect(model.hull).toBe(1);
  });

  it("consumes the manual sonar charge once and protects the hull while it is active", () => {
    const model = createDive();
    expect(activateSonar(model)).toBe(true);
    expect(model.shield).toBe(false);
    expect(model.sonar).toBe(1);
    expect(activateSonar(model)).toBe(false);
    model.y = 0.01;
    stepDive(model, released, 1 / 30);
    expect(model.hull).toBe(3);
    expect(model.invulnerable).toBeGreaterThan(2);
  });

  it("awards each sample once, raises the chain to five, and breaks it when a sample is missed", () => {
    const model = createDive();
    const sampleAwards = [100, 200, 300, 400, 500, 500];
    for (const [index, award] of sampleAwards.entries()) {
      const before = model.score;
      collectSample(model, index);
      expect(model.score - before).toBe(award);
      expect(model.samples).toBe(index + 1);
      const after = structuredClone(model);
      stepDive(model, released, 0);
      expect(model).toEqual(after);
      passGate(model, index);
    }
    expect(model.combo).toBe(5);
    passGate(model, 6);
    expect(model.combo).toBe(0);
    const before = model.score;
    collectSample(model, 7);
    expect(model.score - before).toBe(100);
  });

  it.each([5, 11])("repairs one hull point and restores sonar at checkpoint %i", (index) => {
    const model = createDive();
    model.hull = 1;
    model.shield = false;
    collectSample(model, index);
    expect(model.hull).toBe(2);
    expect(model.shield).toBe(true);
    const fullHull = createDive();
    collectSample(fullHull, index);
    expect(fullHull.hull).toBe(3);
  });

  it("advances zones after six and twelve cleared gates", () => {
    const model = createDive();
    for (let index = 0; index < 5; index += 1) passGate(model, index);
    expect(model.zone).toBe(0);
    passGate(model, 5);
    expect(model.zone).toBe(1);
    for (let index = 6; index < 12; index += 1) passGate(model, index);
    expect(model.zone).toBe(2);
    expect(model.passed).toBe(12);
  });

  it("awards the route completion bonus exactly once and freezes the completed expedition", () => {
    const model = createDive();
    for (let index = 0; index < DIVE_GATE_COUNT; index += 1) passGate(model, index);
    expect(model.outcome).toBe("complete");
    expect(model.score).toBe(DIVE_GATE_COUNT * 50 + 3 * 250);
    const completed = structuredClone(model);
    stepDive(model, { rise: true, dive: false }, 10);
    expect(activateSonar(model)).toBe(false);
    expect(model).toEqual(completed);
  });

  it("ends a dive at zero hull and freezes its score, position, and pickups", () => {
    const model = createDive();
    model.hull = 1;
    model.y = 0.01;
    stepDive(model, released, 1 / 30);
    expect(model.hull).toBe(0);
    expect(model.outcome).toBe("lost");
    const lost = structuredClone(model);
    stepDive(model, { rise: true, dive: false }, 1 / 30);
    expect(activateSonar(model)).toBe(false);
    expect(model).toEqual(lost);
  });

  it("caps long frames to avoid background-tab jumps and rejects negative time", () => {
    const afterLongFrame = createDive();
    const afterCappedFrame = createDive();
    stepDive(afterLongFrame, released, 60);
    stepDive(afterCappedFrame, released, 1 / 30);
    expect(afterLongFrame).toEqual(afterCappedFrame);
    const afterNegativeFrame = createDive();
    const afterZeroFrame = createDive();
    stepDive(afterNegativeFrame, released, -2);
    stepDive(afterZeroFrame, released, 0);
    expect(afterNegativeFrame).toEqual(afterZeroFrame);
  });
});
