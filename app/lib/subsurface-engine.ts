// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

export const DIVE_GATE_COUNT = 18;
export const SUB_X = 0.2;
export const SUB_RADIUS_X = 0.024;
export const SUB_RADIUS_Y = 0.021;
export const GATE_HALF_WIDTH = 0.028;
export const DIVE_ZONES = ["Sunlit shelf", "Coral canyon", "Midnight trench"] as const;

export type DiveGate = { id: number; x: number; center: number; halfGap: number; passed: boolean; sample: boolean; repair: boolean };
export type DiveModel = {
  y: number; velocity: number; elapsed: number; distance: number; score: number;
  samples: number; combo: number; hull: number; shield: boolean; invulnerable: number;
  passed: number; zone: number; gates: DiveGate[]; outcome: "playing" | "lost" | "complete";
  feedback: string; feedbackTime: number; sonar: number;
};
export type DiveControls = { rise: boolean; dive: boolean };

export function createDive(seed = 731): DiveModel {
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (1664525 * randomState + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  let previous = 0.5;
  const gates = Array.from({ length: DIVE_GATE_COUNT }, (_, id): DiveGate => {
    // A bounded change keeps every channel reachable at the maximum swim speed.
    const center = id === 0 ? 0.5 : Math.max(0.28, Math.min(0.72, previous + (random() - 0.5) * 0.32));
    previous = center;
    return { id, x: 0.95 + id * 0.45, center, halfGap: 0.19 - Math.floor(id / 6) * 0.015, passed: false, sample: true, repair: id === 5 || id === 11 };
  });
  return { y: 0.5, velocity: 0, elapsed: 0, distance: 0, score: 0, samples: 0, combo: 0, hull: 3, shield: true, invulnerable: 0, passed: 0, zone: 0, gates, outcome: "playing", feedback: "Hold to rise. Release to descend.", feedbackTime: 4, sonar: 0 };
}

export function activateSonar(model: DiveModel) {
  if (!model.shield || model.outcome !== "playing") return false;
  model.shield = false;
  model.sonar = 1;
  model.invulnerable = Math.max(model.invulnerable, 3);
  model.feedback = "Sonar shield · protected for 3 seconds";
  model.feedbackTime = 2;
  return true;
}

/** Positions and collision bounds are shared by the 3D and fallback renderers. */
export function stepDive(model: DiveModel, controls: DiveControls, elapsedSeconds: number) {
  if (model.outcome !== "playing") return;
  const dt = Math.max(0, Math.min(elapsedSeconds, 1 / 30));
  model.elapsed += dt;
  model.invulnerable = Math.max(0, model.invulnerable - dt);
  model.feedbackTime = Math.max(0, model.feedbackTime - dt);
  model.sonar = Math.max(0, model.sonar - dt * 0.6);
  const target = controls.rise ? -0.28 : controls.dive ? 0.32 : 0.16;
  model.velocity += (target - model.velocity) * (1 - Math.exp(-8 * dt));
  model.y += model.velocity * dt;
  const speed = 0.145 + model.zone * 0.014;
  const movement = speed * dt;
  model.distance += movement;
  let hit = model.y - SUB_RADIUS_Y < 0.06 || model.y + SUB_RADIUS_Y > 0.94;
  model.y = Math.max(0.06 + SUB_RADIUS_Y, Math.min(0.94 - SUB_RADIUS_Y, model.y));

  for (const gate of model.gates) {
    gate.x -= movement;
    const overlap = Math.abs(gate.x - SUB_X) < GATE_HALF_WIDTH + SUB_RADIUS_X;
    if (overlap && Math.abs(model.y - gate.center) + SUB_RADIUS_Y > gate.halfGap) hit = true;
    if (gate.sample && Math.abs(gate.x - SUB_X) < 0.052 && Math.abs(model.y - gate.center) < 0.065) {
      gate.sample = false;
      model.samples += 1;
      model.combo = Math.min(5, model.combo + 1);
      const points = 100 * model.combo;
      model.score += points;
      if (gate.repair) {
        model.hull = Math.min(3, model.hull + 1);
        model.shield = true;
        model.feedback = "Hull repaired · sonar recharged";
      } else {
        model.feedback = `Specimen recovered +${points}${model.combo > 1 ? ` · ${model.combo}× chain` : ""}`;
      }
      model.feedbackTime = 1.65;
    }
    if (!gate.passed && gate.x + GATE_HALF_WIDTH < SUB_X - SUB_RADIUS_X) {
      gate.passed = true;
      model.passed += 1;
      model.score += 50;
      if (gate.sample) model.combo = 0;
      const zone = Math.min(2, Math.floor(model.passed / 6));
      if (zone !== model.zone) {
        model.zone = zone;
        model.feedback = `${DIVE_ZONES[zone]} · keep exploring`;
        model.feedbackTime = 3;
      }
    }
  }

  if (hit && model.invulnerable === 0) {
    model.hull -= 1;
    model.combo = 0;
    model.invulnerable = 1.8;
    model.feedback = model.hull > 0 ? "Hull damaged · steer back into the channel" : "Dive ended · your specimens are safe";
    model.feedbackTime = 2;
    if (model.hull === 0) model.outcome = "lost";
  }
  if (model.outcome === "playing" && model.passed === DIVE_GATE_COUNT) {
    model.score += model.hull * 250;
    model.outcome = "complete";
    model.feedback = "Expedition complete";
  }
}
