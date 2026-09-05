// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { createBoardTrick } from "./railshift-board-trick";
import { initialModel, requestDuck, requestJump, updateModel } from "./railshift-engine";

const TURN = Math.PI * 2;
const DT = 1 / 60;
function jumpSequence(options: { slideFrame?: number; flightFrame?: number; reduced?: boolean; reducedFrame?: number } = {}) {
  const model = initialModel(123);
  const trick = createBoardTrick();
  trick.update(0, 0, 0, 0, 0, !!options.reduced);
  requestJump(model);
  const samples: { time: number; jump: number; rotation: number; release: number; active: boolean }[] = [];
  for (let frame = 0; frame < 90; frame++) {
    if (frame === options.slideFrame) requestDuck(model);
    if (frame === options.flightFrame) { model.flightTimer = 5.5; model.jump = 0; model.jumpVelocity = 0; }
    for (const entity of model.entities) entity.active = false;
    updateModel(model, DT, false);
    const state = trick.update(model.jump, model.jumpVelocity, model.flightHeight, model.flightTimer, model.elapsed, !!options.reduced || (options.reducedFrame !== undefined && frame >= options.reducedFrame));
    samples.push({ time: model.elapsed, jump: model.jump, ...state });
  }
  return samples;
}

describe("Railshift airborne board trick", () => {
  it("releases feet before a full turn and catches a level deck before 0.63 seconds", () => {
    const samples = jumpSequence();
    let largest = 0;
    for (const sample of samples) {
      expect(sample.rotation).toBeGreaterThanOrEqual(0);
      expect(sample.rotation).toBeLessThanOrEqual(TURN);
      if (sample.rotation > 1e-7 && sample.rotation < TURN - 1e-7) expect(sample.release).toBe(1);
      largest = Math.max(largest, sample.rotation);
    }
    expect(largest).toBe(TURN);
    const caught = samples.find(sample => sample.rotation === TURN && sample.release === 0)!;
    expect(caught.time).toBeLessThanOrEqual(0.63);
    expect(caught.jump).toBeGreaterThan(0);
    expect(samples.at(-1)).toMatchObject({ rotation: 0, release: 0, active: false });
  });

  it("keeps all fast-fall timings finite and returns a level, caught deck at touchdown", () => {
    for (let slideFrame = 0; slideFrame < 44; slideFrame++) {
      const samples = jumpSequence({ slideFrame });
      for (const sample of samples) {
        expect(Number.isFinite(sample.rotation + sample.release)).toBe(true);
        if (sample.rotation > 1e-7 && sample.rotation < TURN - 1e-7) expect(sample.release).toBe(1);
        if (sample.jump === 0) expect(sample).toMatchObject({ rotation: 0, release: 0, active: false });
      }
      const lastAirborne = samples.findLast(sample => sample.jump > 0);
      if (lastAirborne) expect(Math.min(lastAirborne.rotation, Math.abs(TURN - lastAirborne.rotation))).toBeLessThan(1e-8);
    }
  });

  it("finishes an already visible turn continuously when rocket flight interrupts", () => {
    for (const flightFrame of [8, 14, 22, 28]) {
      const samples = jumpSequence({ flightFrame });
      const before = samples[flightFrame - 1]!;
      expect(before.rotation).toBeGreaterThan(0);
      expect(samples[flightFrame]!.rotation).toBeGreaterThanOrEqual(before.rotation);
      expect(samples.slice(flightFrame).some(sample => sample.rotation === TURN)).toBe(true);
      expect(samples.at(-1)).toMatchObject({ rotation: TURN, release: 0, active: false });
    }
  });

  it("suppresses reduced-motion tricks and safely finishes a preference change mid-turn", () => {
    expect(jumpSequence({ reduced: true }).every(sample => sample.rotation === 0 && sample.release === 0 && !sample.active)).toBe(true);
    const changed = jumpSequence({ reducedFrame: 14 });
    expect(changed[14]!.rotation).toBeGreaterThan(changed[13]!.rotation);
    expect(changed.slice(14).some(sample => sample.rotation === TURN && sample.release === 0)).toBe(true);
  });

  it("retains output identity, freezes paused redraws and resets on clock rewind or explicit restart", () => {
    const trick = createBoardTrick();
    const state = trick.update(0.04, 2.1, 0, 0, 1, false);
    for (let frame = 1; frame < 15; frame++) expect(trick.update(0.3, 0.8, 0, 0, 1 + frame * DT, false)).toBe(state);
    const before = { ...state };
    expect(trick.update(0.3, 0.8, 0, 0, 1 + 14 * DT, true)).toEqual(before);
    expect(trick.update(0, 0, 0, 0, 0, false)).toEqual({ rotation: 0, release: 0, active: false });
    trick.update(0.04, 2.1, 0, 0, 1, false);
    trick.reset();
    expect(state).toEqual({ rotation: 0, release: 0, active: false });
  });

  it("starts from an upward impulse and retriggers on a legal near-ground jump without touchdown", () => {
    const model = initialModel(123);
    const trick = createBoardTrick();
    requestJump(model);
    expect(trick.update(model.jump, model.jumpVelocity, 0, 0, 0, false).active).toBe(true);
    let retriggered = false;
    let secondTurn = false;
    for (let frame = 0; frame < 110; frame++) {
      if (!retriggered && model.jump > 0 && model.jump <= 0.03 && model.jumpVelocity < 0) {
        expect(requestJump(model)).toBe(true);
        retriggered = true;
      }
      for (const entity of model.entities) entity.active = false;
      updateModel(model, DT, false);
      const state = trick.update(model.jump, model.jumpVelocity, 0, 0, model.elapsed, false);
      if (retriggered && state.rotation > 0.1 && state.rotation < TURN - 0.1) secondTurn = true;
    }
    expect(retriggered).toBe(true);
    expect(secondTurn).toBe(true);
  });

  it("does not begin a flip for an early rocket pickup or while the rocket is descending", () => {
    const samples = jumpSequence({ flightFrame: 0 });
    expect(samples.every(sample => sample.rotation === 0 && sample.release === 0 && !sample.active)).toBe(true);
    const trick = createBoardTrick();
    expect(trick.update(0, 0, 0.8, 0, 1, false)).toEqual({ rotation: 0, release: 0, active: false });
  });
});
