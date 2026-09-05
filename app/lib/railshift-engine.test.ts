// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";
import {
  activateBurst, BURST_DURATION, ENTITY_POOL_SIZE,
  EVENT_BURST, EVENT_CELL, EVENT_CHECKPOINT, EVENT_COMBO,
  EVENT_DAMAGE, EVENT_FLIGHT, EVENT_IMPACT, EVENT_MAGNET, EVENT_SHIELD, FLIGHT_DURATION, MAGNET_DURATION,
  initialModel, requestDuck, requestJump, updateModel,
  type EntityKind, type Lane, type RunnerModel,
} from "./railshift-engine";

const STEP = 1 / 60;
const hazard = (kind: EntityKind) => kind === "block" || kind === "barrier" || kind === "gantry";

function emptyTrack(seed = 7) {
  const model = initialModel(seed);
  model.spawnTimer = 100_000;
  return model;
}

function approaching(model: RunnerModel, kind: EntityKind, lane: Lane = 0, z = 0.13) {
  const entity = model.entities.find((candidate) => !candidate.active)!;
  Object.assign(entity, { active: true, checked: false, kind, lane, z, magnetPull: 0 });
  return entity;
}

function advance(model: RunnerModel, seconds: number, reducedMotion = true) {
  let events = 0;
  for (let frame = 0; frame < Math.round(seconds / STEP); frame += 1) {
    events |= updateModel(model, STEP, reducedMotion);
  }
  return events;
}

describe("Railshift route and progression", () => {
  it("opens with cells and flight equipment before the obstacle and shield rows", () => {
    const model = initialModel(3);
    const rows = [];
    for (let row = 0; row < 5; row += 1) {
      model.entities.forEach((entity) => { entity.active = false; });
      model.spawnTimer = 0;
      updateModel(model, STEP, true);
      rows.push(model.entities.filter((entity) => entity.active).map((entity) => entity.kind));
    }
    expect(rows).toEqual([
      ["cell", "cell", "cell"],
      ["jetpack", "cell", "cell"],
      ["barrier", "cell", "cell"],
      ["gantry", "cell", "cell"],
      ["shield", "cell", "cell"],
    ]);
  });

  it("always leaves a neighboring safe lane, with no duplicate hazards or overlapping rows", () => {
    for (const seed of [0, 1, 9, 17, 999, 4_294_967_295]) {
      const model = initialModel(seed);
      for (let row = 0; row < 250; row += 1) {
        const previousSafe = model.lastSafeLane;
        model.entities.forEach((entity) => { entity.active = false; });
        model.distance = row * 20;
        model.spawnTimer = 0;
        updateModel(model, STEP, true);
        const entities = model.entities.filter((entity) => entity.active);
        const hazards = entities.filter((entity) => hazard(entity.kind));
        expect(hazards.length).toBeLessThanOrEqual(2);
        expect(new Set(hazards.map((entity) => entity.lane)).size).toBe(hazards.length);
        expect(hazards.some((entity) => entity.lane === model.lastSafeLane)).toBe(false);
        expect(Math.abs(previousSafe - model.lastSafeLane)).toBeLessThanOrEqual(1);
        const rowDepth = Math.max(...entities.map((entity) => entity.z)) - Math.min(...entities.map((entity) => entity.z));
        // Minimum temporal gap gives >.28 world units of clear track after a row.
        expect(rowDepth).toBeLessThanOrEqual(0.181);
        expect(model.spawnTimer * model.speed - rowDepth).toBeGreaterThan(0.28);
      }
    }
  });

  it("supports a long run through the generated route using normal lane interpolation", () => {
    const model = initialModel(37);
    let events = 0;
    while (model.distance < 1_250 && model.hull > 0) {
      const ahead = model.entities
        .filter((entity) => entity.active && !entity.checked && hazard(entity.kind))
        .sort((a, b) => a.z - b.z);
      const nearest = ahead[0];
      if (nearest && nearest.z < 0.4) {
        const blocked = ahead.filter((entity) => Math.abs(entity.z - nearest.z) < 0.04).map((entity) => entity.lane);
        const clear = ([-1, 0, 1] as Lane[]).filter((lane) => !blocked.includes(lane));
        clear.sort((a, b) => Math.abs(a - model.lane) - Math.abs(b - model.lane));
        model.lane = clear[0] ?? model.lane;
      }
      events |= updateModel(model, STEP, true);
    }
    expect(model.distance).toBeGreaterThanOrEqual(1_250);
    expect(model.hull).toBe(2);
    expect(events & (EVENT_DAMAGE | EVENT_IMPACT)).toBe(0);
    expect(model.checkpoints).toBe(5);
    expect(model.entities).toHaveLength(ENTITY_POOL_SIZE);
  });

  it("keeps route generation identical with and without particle effects", () => {
    const full = initialModel(992);
    const reduced = initialModel(992);
    full.invulnerabilityTimer = reduced.invulnerabilityTimer = 100;
    advance(full, 35, false);
    advance(reduced, 35, true);
    expect(full.seed).toBe(reduced.seed);
    expect(full.entities).toEqual(reduced.entities);
    expect(full.score).toBe(reduced.score);
    expect(full.cells).toBeGreaterThan(0);
    expect(full.particleSeed).not.toBe(reduced.particleSeed);
  });

  it("integrates equal elapsed time consistently and rejects invalid or stale frame deltas", () => {
    const smooth = emptyTrack();
    const batched = emptyTrack();
    advance(smooth, 1);
    for (let frame = 0; frame < 10; frame += 1) updateModel(batched, 0.1, true);
    expect(batched.distance).toBeCloseTo(smooth.distance, 8);
    expect(batched.score).toBeCloseTo(smooth.score, 8);
    const unchanged = structuredClone(batched);
    for (const delta of [0, -1, NaN, Infinity]) expect(updateModel(batched, delta, true)).toBe(0);
    expect(batched).toEqual(unchanged);
    updateModel(batched, 30, true);
    expect(batched.elapsed - unchanged.elapsed).toBeCloseTo(0.1, 8);
  });

  it("awards a checkpoint once and moves into the next district", () => {
    const model = emptyTrack();
    model.distance = 249.99;
    model.combo = 3;
    expect(updateModel(model, STEP, true) & EVENT_CHECKPOINT).toBe(EVENT_CHECKPOINT);
    expect(model.score).toBeGreaterThan(900);
    expect(model.checkpoints).toBe(1);
    expect(model.district).toBe(1);
    expect(model.message).toContain("250m checkpoint");
    expect(updateModel(model, STEP, true) & EVENT_CHECKPOINT).toBe(0);
    expect(model.score).toBeLessThan(905);
  });
});

describe("Railshift player actions", () => {
  it("builds a consecutive-cell multiplier, then resets it immediately on a missed cell", () => {
    const model = emptyTrack();
    for (let cell = 0; cell < 5; cell += 1) {
      approaching(model, "cell");
      const events = updateModel(model, STEP, true);
      expect(events & EVENT_CELL).toBe(EVENT_CELL);
      if (cell === 4) expect(events & EVENT_COMBO).toBe(EVENT_COMBO);
    }
    expect(model.combo).toBe(2);
    expect(model.streak).toBe(5);
    approaching(model, "cell", 1);
    updateModel(model, STEP, true);
    expect(model.combo).toBe(1);
    expect(model.streak).toBe(0);
    expect(model.bestStreak).toBe(5);
    approaching(model, "cell");
    updateModel(model, STEP, true);
    expect(model.cells).toBe(6);
    expect(model.streak).toBe(1);
    expect(model.combo).toBe(1);
  });

  it("spends a collected shield before hull and gives a grace period against stacked impacts", () => {
    const model = emptyTrack();
    approaching(model, "shield");
    expect(updateModel(model, STEP, true) & EVENT_SHIELD).toBe(EVENT_SHIELD);
    expect(model.shield).toBe(1);
    approaching(model, "block");
    approaching(model, "barrier");
    const events = updateModel(model, STEP, true);
    expect(events & EVENT_SHIELD).toBe(EVENT_SHIELD);
    expect(events & (EVENT_IMPACT | EVENT_DAMAGE)).toBe(0);
    expect(model.hull).toBe(2);
    expect(model.shield).toBe(0);
    expect(model.invulnerabilityTimer).toBeGreaterThan(1);
    advance(model, 1.4);
    approaching(model, "block");
    expect(updateModel(model, STEP, true) & EVENT_DAMAGE).toBe(EVENT_DAMAGE);
    expect(model.hull).toBe(1);
  });

  it("ends only on the second unprotected hit, explains the cause, and freezes the model", () => {
    const model = emptyTrack();
    approaching(model, "block");
    expect(updateModel(model, STEP, true) & EVENT_IMPACT).toBe(0);
    advance(model, 1.4);
    approaching(model, "gantry");
    expect(updateModel(model, STEP, true) & EVENT_IMPACT).toBe(EVENT_IMPACT);
    expect(model.hull).toBe(0);
    expect(model.endCause).toContain("Slide underneath");
    const final = structuredClone(model);
    expect(updateModel(model, 0.1, true)).toBe(0);
    expect(model).toEqual(final);
    expect(requestJump(model)).toBe(false);
    expect(requestDuck(model)).toBe(false);
  });

  it("jumps low barriers, slides high gates, and prevents repeated airborne jumps", () => {
    const model = emptyTrack();
    expect(requestJump(model)).toBe(true);
    expect(requestJump(model)).toBe(false);
    advance(model, 0.2);
    expect(model.jump).toBeGreaterThan(0.27);
    approaching(model, "barrier");
    expect(updateModel(model, STEP, true) & (EVENT_DAMAGE | EVENT_IMPACT)).toBe(0);
    advance(model, 0.7);
    expect(model.jump).toBe(0);
    expect(requestDuck(model)).toBe(true);
    approaching(model, "gantry");
    expect(updateModel(model, STEP, true) & (EVENT_DAMAGE | EVENT_IMPACT)).toBe(0);
    expect(model.hull).toBe(2);
  });

  it("charges overdrive through collection, clears hazards, and requires another full charge", () => {
    const model = emptyTrack();
    expect(activateBurst(model)).toBe(false);
    for (let cell = 0; cell < 8; cell += 1) {
      approaching(model, "cell");
      updateModel(model, STEP, true);
    }
    expect(model.energy).toBe(100);
    expect(activateBurst(model)).toBe(true);
    expect(model.burstTimer).toBe(BURST_DURATION);
    expect(model.energy).toBe(0);
    approaching(model, "block");
    const events = updateModel(model, STEP, true);
    expect(events & EVENT_BURST).toBe(EVENT_BURST);
    expect(events & (EVENT_DAMAGE | EVENT_IMPACT)).toBe(0);
    expect(model.hull).toBe(2);
    expect(activateBurst(model)).toBe(false);
    advance(model, BURST_DURATION + 0.1);
    expect(model.burstTimer).toBe(0);
    expect(activateBurst(model)).toBe(false);
  });

  it("automatically equips the first rocket backpack in under eight seconds", () => {
    const model = initialModel(41);
    let pickupTime = 0;
    while (model.elapsed < 8 && pickupTime === 0) {
      if (updateModel(model, STEP, true) & EVENT_FLIGHT) pickupTime = model.elapsed;
    }
    expect(pickupTime).toBeGreaterThan(4);
    expect(pickupTime).toBeLessThan(8);
    expect(model.flightTimer).toBe(FLIGHT_DURATION);
    expect(model.hull).toBe(2);
    expect(model.lane).toBe(0);
  });

  it("flies over every ground hazard, keeps cell collection, and spends no shield or life", () => {
    const model = emptyTrack();
    model.shield = 1;
    approaching(model, "jetpack");
    expect(updateModel(model, STEP, true) & EVENT_FLIGHT).toBe(EVENT_FLIGHT);
    expect(model.flightHeight).toBe(0);
    expect(requestJump(model)).toBe(false);
    expect(requestDuck(model)).toBe(false);
    // Protection starts at lift-off, before the visible ascent reaches height.
    for (const kind of ["block", "barrier", "gantry"] as const) {
      const obstacle = approaching(model, kind);
      expect(updateModel(model, STEP, true) & (EVENT_DAMAGE | EVENT_IMPACT)).toBe(0);
      expect(obstacle.active).toBe(true);
    }
    advance(model, 0.5);
    expect(model.flightHeight).toBe(1);
    approaching(model, "cell");
    expect(updateModel(model, STEP, true) & EVENT_CELL).toBe(EVENT_CELL);
    expect(model.cells).toBe(1);
    expect(model.shield).toBe(1);
    expect(model.hull).toBe(2);
  });

  it("descends after expiry, protects touchdown, then restores normal collision and controls", () => {
    const model = emptyTrack();
    approaching(model, "jetpack");
    updateModel(model, STEP, true);
    advance(model, FLIGHT_DURATION + 0.2);
    expect(model.flightTimer).toBe(0);
    expect(model.flightHeight).toBeGreaterThan(0);
    expect(model.flightHeight).toBeLessThan(1);
    approaching(model, "block");
    expect(updateModel(model, STEP, true) & EVENT_DAMAGE).toBe(0);
    expect(model.invulnerabilityTimer).toBe(0);
    advance(model, 0.7);
    expect(model.flightHeight).toBe(0);
    expect(model.invulnerabilityTimer).toBeGreaterThan(1);
    expect(requestJump(model)).toBe(true);
    approaching(model, "block");
    expect(updateModel(model, STEP, true) & EVENT_DAMAGE).toBe(0);
    advance(model, 1.4);
    approaching(model, "block");
    expect(updateModel(model, STEP, true) & EVENT_DAMAGE).toBe(EVENT_DAMAGE);
    expect(model.hull).toBe(1);
  });

  it("places recurring flight equipment on the clear route rather than in an obstacle lane", () => {
    const model = initialModel(531);
    for (let row = 1; row <= 48; row += 1) {
      model.entities.forEach((entity) => { entity.active = false; });
      model.spawnTimer = 0;
      updateModel(model, STEP, true);
      const equipment = model.entities.filter((entity) => entity.active && entity.kind === "jetpack");
      if (row === 2 || row % 12 === 0) {
        expect(equipment).toHaveLength(1);
        expect(equipment[0]?.lane).toBe(model.lastSafeLane);
      } else {
        expect(equipment).toHaveLength(0);
      }
    }
  });

  it("keeps Overdrive energy through powered flight and descent, then allows it after landing", () => {
    const model = emptyTrack();
    model.energy = 100;
    approaching(model, "jetpack");
    updateModel(model, STEP, true);
    expect(activateBurst(model)).toBe(false);
    expect(model.energy).toBe(100);
    expect(model.burstTimer).toBe(0);
    advance(model, FLIGHT_DURATION + 0.2);
    expect(model.flightTimer).toBe(0);
    expect(model.flightHeight).toBeGreaterThan(0);
    expect(activateBurst(model)).toBe(false);
    expect(model.energy).toBe(100);
    advance(model, 0.7);
    expect(model.flightHeight).toBe(0);
    expect(activateBurst(model)).toBe(true);
    expect(model.energy).toBe(0);
    expect(model.burstTimer).toBe(BURST_DURATION);
  });

  it("draws nearby coins out of both neighboring lanes before awarding each exactly once", () => {
    const model = emptyTrack();
    approaching(model, "magnet");
    expect(updateModel(model, STEP, true) & EVENT_MAGNET).toBe(EVENT_MAGNET);
    expect(model.magnetTimer).toBe(MAGNET_DURATION);
    const left = approaching(model, "cell", -1, 0.44);
    const right = approaching(model, "cell", 1, 0.44);
    expect(updateModel(model, STEP, true) & EVENT_CELL).toBe(0);
    expect(model.cells).toBe(0);
    expect(left.active).toBe(true);
    expect(right.active).toBe(true);
    expect(left.magnetPull).toBeGreaterThan(0);
    expect(left.magnetPull).toBeLessThan(1);
    expect(left.lane).toBe(-1);
    expect(right.lane).toBe(1);
    advance(model, 0.2);
    expect(model.cells).toBe(0);
    expect(left.z).toBeLessThan(0.2);
    advance(model, 0.25);
    expect(model.cells).toBe(2);
    expect(model.streak).toBe(2);
    expect(left.active).toBe(false);
    expect(right.active).toBe(false);
    expect(left.z).toBeGreaterThanOrEqual(0.13);
    advance(model, 1);
    expect(model.cells).toBe(2);
  });

  it("does not pull distant coins and finishes existing curves after magnet expiry", () => {
    const model = emptyTrack();
    model.magnetTimer = 0.08;
    const near = approaching(model, "cell", -1, 0.44);
    const far = approaching(model, "cell", 1, 0.75);
    updateModel(model, STEP, true);
    expect(near.magnetPull).toBeGreaterThan(0);
    expect(far.magnetPull).toBe(0);
    advance(model, 0.1);
    expect(model.magnetTimer).toBe(0);
    const afterExpiry = approaching(model, "cell", 1, 0.35);
    advance(model, 0.4);
    expect(near.active).toBe(false);
    expect(model.cells).toBe(1);
    expect(afterExpiry.magnetPull).toBe(0);
    expect(far.magnetPull).toBe(0);
    advance(model, 2);
    expect(model.cells).toBe(1);
    expect(model.streak).toBe(0);
  });

  it("introduces the magnet after flight and repeats it on a clear reachable lane", () => {
    const model = initialModel(592);
    for (let row = 1; row <= 60; row += 1) {
      model.entities.forEach((entity) => { entity.active = false; });
      model.spawnTimer = 0;
      updateModel(model, STEP, true);
      const equipment = model.entities.filter((entity) => entity.active && entity.kind === "magnet");
      if (row === 6 || (row % 10 === 0 && row % 12 !== 0)) {
        expect(equipment).toHaveLength(1);
        expect(equipment[0]?.lane).toBe(model.lastSafeLane);
      } else {
        expect(equipment).toHaveLength(0);
      }
    }
    const opening = initialModel(592);
    let pickupTime = 0;
    while (opening.elapsed < 16 && !pickupTime) {
      if (updateModel(opening, STEP, true) & EVENT_MAGNET) pickupTime = opening.elapsed;
    }
    expect(pickupTime).toBeGreaterThan(11);
    expect(pickupTime).toBeLessThan(15);
    expect(opening.hull).toBe(2);
  });

  it("clears attraction state when pooled entities are reused", () => {
    const model = emptyTrack();
    model.magnetTimer = 1;
    const coin = approaching(model, "cell", 1, 0.4);
    advance(model, 0.5);
    expect(coin.magnetPull).toBe(1);
    expect(coin.active).toBe(false);
    model.magnetTimer = 0;
    model.spawnTimer = 0;
    updateModel(model, STEP, true);
    expect(coin.active).toBe(true);
    expect(coin.magnetPull).toBe(0);
    expect(coin.checked).toBe(false);
  });
});
