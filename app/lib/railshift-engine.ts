// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

export type Lane = -1 | 0 | 1;
export type RunnerStatus = "idle" | "playing" | "paused" | "crashed";
export type EntityKind = "barrier" | "gantry" | "block" | "cell" | "shield" | "jetpack" | "magnet";
export type TrackEntity = {
  active: boolean;
  checked: boolean;
  kind: EntityKind;
  lane: Lane;
  z: number;
  magnetPull: number;
};
export type Particle = {
  active: boolean;
  color: "ink" | "signal";
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};
export type RunnerModel = {
  lane: Lane;
  laneVisual: number;
  jump: number;
  jumpVelocity: number;
  duckTimer: number;
  speed: number;
  distance: number;
  score: number;
  cells: number;
  combo: number;
  shield: number;
  elapsed: number;
  spawnTimer: number;
  rows: number;
  seed: number;
  particleSeed: number;
  lastSafeLane: Lane;
  entities: TrackEntity[];
  particles: Particle[];
  hull: number;
  invulnerabilityTimer: number;
  streak: number;
  bestStreak: number;
  district: number;
  checkpoints: number;
  energy: number;
  burstTimer: number;
  flightTimer: number;
  flightHeight: number;
  magnetTimer: number;
  message: string;
  messageTimer: number;
  tutorial: string;
  tutorialTimer: number;
  endCause: string;
};

export const EVENT_CELL = 1;
export const EVENT_SHIELD = 2;
/** A fatal impact. Nonfatal hull damage has its own event. */
export const EVENT_IMPACT = 4;
export const EVENT_DAMAGE = 8;
export const EVENT_CHECKPOINT = 16;
export const EVENT_COMBO = 32;
export const EVENT_BURST = 64;
export const EVENT_FLIGHT = 128;
export const EVENT_MAGNET = 256;
export const ENTITY_POOL_SIZE = 72;
export const PARTICLE_POOL_SIZE = 42;
export const CHECKPOINT_DISTANCE = 250;
export const BURST_DURATION = 2.2;
export const FLIGHT_DURATION = 5.5;
export const MAGNET_DURATION = 6;
const FIXED_STEP = 1 / 60;
const COLLISION_Z = 0.13;
const FAR_Z = 1.12;
const LANES: readonly Lane[] = [-1, 0, 1];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function asLane(value: number): Lane {
  return clamp(Math.round(value), -1, 1) as Lane;
}

function random(model: RunnerModel) {
  model.seed = (Math.imul(model.seed, 1_664_525) + 1_013_904_223) >>> 0;
  return model.seed / 4_294_967_296;
}

function particleRandom(model: RunnerModel) {
  // Rendering preferences must never change the generated route.
  model.particleSeed = (Math.imul(model.particleSeed, 1_664_525) + 1_013_904_223) >>> 0;
  return model.particleSeed / 4_294_967_296;
}

export function initialModel(seed = (Date.now() ^ 0x9e3779b9) >>> 0): RunnerModel {
  return {
    lane: 0, laneVisual: 0, jump: 0, jumpVelocity: 0, duckTimer: 0,
    speed: 0.3, distance: 0, score: 0, cells: 0, combo: 1, shield: 0,
    elapsed: 0, spawnTimer: 0.25, rows: 0, seed: seed >>> 0,
    particleSeed: (seed ^ 0xa511e9b3) >>> 0, lastSafeLane: 0,
    entities: Array.from({ length: ENTITY_POOL_SIZE }, () => ({
      active: false, checked: false, kind: "cell", lane: 0, z: 0, magnetPull: 0,
    })),
    particles: Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false, color: "signal", life: 0, x: 0, y: 0, vx: 0, vy: 0,
    })),
    hull: 2, invulnerabilityTimer: 0, streak: 0, bestStreak: 0,
    district: 0, checkpoints: 0, energy: 0, burstTimer: 0,
    flightTimer: 0, flightHeight: 0, magnetTimer: 0,
    message: "", messageTimer: 0,
    tutorial: "Collect gold coins · Left / right to change lanes.",
    tutorialTimer: 5.5, endCause: "",
  };
}

function notify(model: RunnerModel, message: string, duration = 1.5) {
  model.message = message;
  model.messageTimer = duration;
}

export function requestJump(model: RunnerModel): boolean {
  if (model.hull <= 0 || model.flightTimer > 0 || model.flightHeight > 0 || model.jump > 0.03 || model.jumpVelocity > 0) return false;
  model.duckTimer = 0;
  model.jumpVelocity = 2.28;
  return true;
}

export function requestDuck(model: RunnerModel): boolean {
  if (model.hull <= 0 || model.flightTimer > 0 || model.flightHeight > 0) return false;
  model.duckTimer = 0.7;
  if (model.jump > 0.05) model.jumpVelocity = Math.min(model.jumpVelocity, -1.9);
  return true;
}

export function activateBurst(model: RunnerModel): boolean {
  if (model.hull <= 0 || model.energy < 100 || model.burstTimer > 0 || model.flightTimer > 0 || model.flightHeight > 0) return false;
  model.energy = 0;
  model.burstTimer = BURST_DURATION;
  notify(model, "Overdrive · break through obstacles", BURST_DURATION);
  return true;
}

function spawnEntity(model: RunnerModel, kind: EntityKind, lane: Lane, z: number) {
  const entity = model.entities.find((candidate) => !candidate.active);
  if (!entity) return;
  Object.assign(entity, { active: true, checked: false, kind, lane, z, magnetPull: 0 });
}

function trail(model: RunnerModel, lane: Lane, count = 3, offset = 0) {
  // Row tails never exceed .18 world units; the minimum row gap is .5.
  for (let index = 0; index < count; index += 1) {
    spawnEntity(model, "cell", lane, FAR_Z + offset + index * 0.09);
  }
}

function reachableLane(model: RunnerModel) {
  const options = LANES.filter((lane) => Math.abs(lane - model.lastSafeLane) <= 1);
  return options[Math.floor(random(model) * options.length)] ?? 0;
}

function lesson(model: RunnerModel, text: string) {
  model.tutorial = text;
  model.tutorialTimer = 2.5;
}

function spawnRow(model: RunnerModel) {
  model.rows += 1;
  let safeLane = model.lastSafeLane;

  // A predictable opening introduces one decision at a time. Every obstacle
  // lesson also leaves a neighboring lane open, so learning is not a trap.
  if (model.rows === 1) {
    trail(model, 0);
  } else if (model.rows === 2) {
    spawnEntity(model, "jetpack", 0, FAR_Z);
    trail(model, 0, 2, 0.09);
  } else if (model.rows === 3) {
    spawnEntity(model, "barrier", 0, FAR_Z);
    trail(model, 0, 2, 0.09);
    safeLane = -1;
  } else if (model.rows === 4) {
    spawnEntity(model, "gantry", 0, FAR_Z);
    trail(model, 0, 2, 0.09);
    safeLane = -1;
  } else if (model.rows === 5) {
    spawnEntity(model, "shield", 0, FAR_Z);
    trail(model, 0, 2, 0.09);
    safeLane = 0;
  } else if (model.rows === 6) {
    spawnEntity(model, "magnet", 0, FAR_Z);
    trail(model, 0, 2, 0.09);
    safeLane = 0;
  } else {
    safeLane = reachableLane(model);
    const roll = random(model);
    if (model.rows % 12 === 0) {
      spawnEntity(model, "jetpack", safeLane, FAR_Z);
      trail(model, safeLane, 2, 0.09);
    } else if (model.rows % 10 === 0) {
      spawnEntity(model, "magnet", safeLane, FAR_Z);
      trail(model, safeLane, 2, 0.09);
    } else if (model.rows % 8 === 0 && model.shield === 0) {
      spawnEntity(model, "shield", safeLane, FAR_Z);
      trail(model, safeLane, 2, 0.09);
    } else if (roll < 0.2) {
      // Recovery rhythm: an open stretch to rebuild a broken streak.
      trail(model, safeLane);
    } else if (roll < 0.5) {
      for (const lane of LANES) {
        if (lane !== safeLane) spawnEntity(model, "block", lane, FAR_Z);
      }
      trail(model, safeLane);
    } else if (roll < 0.78) {
      // Optional jump / slide bonuses, with a clear bypass alongside them.
      const obstacleLane = asLane(safeLane === 0 ? (random(model) < 0.5 ? -1 : 1) : 0);
      spawnEntity(model, roll < 0.64 ? "barrier" : "gantry", obstacleLane, FAR_Z);
      spawnEntity(model, "block", asLane(-obstacleLane - safeLane), FAR_Z);
      trail(model, safeLane);
    } else {
      // A gentle slalom; its exit is at most one lane from its entrance.
      trail(model, safeLane, 2);
      const exitOptions = LANES.filter((lane) =>
        Math.abs(lane - safeLane) === 1 && Math.abs(lane - model.lastSafeLane) <= 1,
      );
      const exitLane = exitOptions[Math.floor(random(model) * exitOptions.length)] ?? 0;
      spawnEntity(model, "cell", exitLane, FAR_Z + 0.18);
      safeLane = exitLane;
    }
  }

  model.lastSafeLane = safeLane;
  // Space is measured against the maximum speed until the next row. Even at
  // top speed the full row passes before another arrives; no merged walls.
  const worldGap = model.rows < 6 ? 0.68 : Math.max(0.5, 0.62 - model.district * 0.025);
  model.spawnTimer += worldGap / Math.min(0.68, model.speed + 0.012);
}

function emitParticles(model: RunnerModel, lane: number, color: Particle["color"], count: number) {
  let emitted = 0;
  for (const particle of model.particles) {
    if (particle.active) continue;
    const angle = particleRandom(model) * Math.PI * 2;
    const force = 0.05 + particleRandom(model) * 0.13;
    Object.assign(particle, {
      active: true, color, life: 0.42 + particleRandom(model) * 0.24,
      x: 0.5 + lane * 0.18, y: 0.73,
      vx: Math.cos(angle) * force, vy: Math.sin(angle) * force - 0.12,
    });
    if (++emitted >= count) break;
  }
}

function resetStreak(model: RunnerModel) {
  model.streak = 0;
  model.combo = 1;
}

function collectCoin(model: RunnerModel, entity: TrackEntity, reducedMotion: boolean) {
  let events = EVENT_CELL;
  entity.active = false;
  entity.checked = true;
  model.cells += 1;
  model.streak += 1;
  model.bestStreak = Math.max(model.bestStreak, model.streak);
  const nextCombo = Math.min(5, 1 + Math.floor(model.streak / 5));
  if (nextCombo > model.combo) {
    notify(model, `Clean streak · ×${nextCombo} score`);
    events |= EVENT_COMBO;
  }
  model.combo = nextCombo;
  const wasReady = model.energy >= 100;
  if (model.burstTimer === 0) model.energy = Math.min(100, model.energy + 12.5);
  if (!wasReady && model.energy === 100) notify(model, "Overdrive ready · press Shift", 2.4);
  model.score += 25 * model.combo;
  if (!reducedMotion) emitParticles(model, entity.magnetPull > 0 ? model.laneVisual : entity.lane, "signal", 7);
  return events;
}

function updateStep(model: RunnerModel, delta: number, reducedMotion: boolean) {
  let events = 0;
  model.elapsed += delta;
  model.speed = clamp(0.3 + model.distance * 0.00017, 0.3, 0.68);
  const travel = model.speed * delta;
  model.distance += travel * 66;
  model.score += travel * 100 * model.combo;
  model.laneVisual += (model.lane - model.laneVisual) * Math.min(1, delta * 17);
  model.invulnerabilityTimer = Math.max(0, model.invulnerabilityTimer - delta);
  model.burstTimer = Math.max(0, model.burstTimer - delta);
  model.magnetTimer = Math.max(0, model.magnetTimer - delta);
  model.flightTimer = Math.max(0, model.flightTimer - delta);
  if (model.flightTimer > 0) {
    model.flightHeight = Math.min(1, model.flightHeight + delta * 2.5);
  } else if (model.flightHeight > 0) {
    model.flightHeight = Math.max(0, model.flightHeight - delta * 1.25);
    if (model.flightHeight === 0) {
      // Protect the actual touchdown, not the beginning of the descent.
      model.invulnerabilityTimer = Math.max(model.invulnerabilityTimer, 1.3);
      notify(model, "Touchdown · back on the rails");
    }
  }
  model.messageTimer = Math.max(0, model.messageTimer - delta);
  model.tutorialTimer = Math.max(0, model.tutorialTimer - delta);

  if (model.jump > 0 || model.jumpVelocity > 0) {
    model.jumpVelocity -= 5.8 * delta;
    model.jump = Math.max(0, model.jump + model.jumpVelocity * delta);
    if (model.jump === 0) model.jumpVelocity = 0;
  }
  model.duckTimer = Math.max(0, model.duckTimer - delta);
  model.spawnTimer -= delta;
  if (model.spawnTimer <= 0) spawnRow(model);

  const checkpoint = Math.floor(model.distance / CHECKPOINT_DISTANCE);
  if (checkpoint > model.checkpoints) {
    model.score += (checkpoint - model.checkpoints) * 300 * model.combo;
    model.checkpoints = checkpoint;
    model.district = checkpoint;
    notify(model, `${checkpoint * CHECKPOINT_DISTANCE}m checkpoint · +${300 * model.combo}`, 2.6);
    events |= EVENT_CHECKPOINT;
  }

  for (const entity of model.entities) {
    if (!entity.active) continue;
    const enteringCueRange = entity.z > 0.65 && entity.z - travel <= 0.65;
    entity.z -= travel;
    // Teach when the object is readable on screen, rather than at its distant
    // spawn, which could replace the jump cue with slide before the jump.
    if (enteringCueRange && model.distance < 350) {
      const grounded = model.flightTimer === 0 && model.flightHeight === 0;
      if (entity.kind === "jetpack") lesson(model, "Rocket backpack · collect it to take flight.");
      else if (entity.kind === "magnet") lesson(model, "Magnet · pulls nearby gold coins toward you.");
      else if (entity.kind === "barrier" && grounded) lesson(model, "Low barrier · Up to jump, or change lanes.");
      else if (entity.kind === "gantry" && grounded) lesson(model, "High gate · Down to slide, or change lanes.");
      else if (entity.kind === "block" && grounded) lesson(model, "Train ahead · change lanes to pass.");
      else if (entity.kind === "shield") lesson(model, "Shield · protects you from one hit.");
    }
    if (entity.kind === "cell" && (
      entity.magnetPull > 0 || (!entity.checked && model.magnetTimer > 0 && entity.z <= 0.45)
    )) {
      // Capture once, then animate for .4 seconds before awarding the coin.
      // A captured coin finishes its curve even if the equipment timer expires.
      entity.checked = true;
      entity.magnetPull = Math.min(1, entity.magnetPull + delta * 2.5);
      entity.z = Math.max(COLLISION_Z, entity.z + (COLLISION_Z - entity.z) * Math.min(1, delta * 8));
      if (entity.magnetPull >= 1) events |= collectCoin(model, entity, reducedMotion);
      continue;
    }
    if (!entity.checked && entity.z <= COLLISION_Z) {
      entity.checked = true;
      const inLane = entity.lane === asLane(model.laneVisual);
      if (entity.kind === "cell") {
        if (inLane) {
          events |= collectCoin(model, entity, reducedMotion);
        } else {
          // A missed cell is checked at the collection line, not after it has
          // already been marked checked and removed (the old reset never ran).
          resetStreak(model);
        }
      } else if (entity.kind === "magnet") {
        if (inLane) {
          entity.active = false;
          model.magnetTimer = MAGNET_DURATION;
          model.score += 75;
          notify(model, "Magnet active · bring in the gold", 2.4);
          events |= EVENT_MAGNET;
          if (!reducedMotion) emitParticles(model, entity.lane, "signal", 12);
        }
      } else if (entity.kind === "jetpack") {
        if (inLane) {
          entity.active = false;
          model.flightTimer = FLIGHT_DURATION;
          model.jump = 0;
          model.jumpVelocity = 0;
          model.duckTimer = 0;
          model.score += 100;
          notify(model, "Rocket backpack · lift off!", 2.4);
          lesson(model, "Fly above the trains · steer to collect coins.");
          events |= EVENT_FLIGHT;
          if (!reducedMotion) emitParticles(model, entity.lane, "signal", 16);
        }
      } else if (entity.kind === "shield") {
        if (inLane) {
          entity.active = false;
          model.shield = 1;
          model.score += 75;
          notify(model, "Shield collected · one hit protected");
          events |= EVENT_SHIELD;
          if (!reducedMotion) emitParticles(model, entity.lane, "ink", 12);
        }
      } else if (inLane) {
        // Powered ascent and the entire descent are protected. Hazards remain
        // on the track beneath the player rather than exploding like Overdrive.
        if (model.flightTimer > 0 || model.flightHeight > 0) continue;
        const jumped = entity.kind === "barrier" && model.jump > 0.27;
        const ducked = entity.kind === "gantry" && model.duckTimer > 0 && model.jump < 0.18;
        if (jumped || ducked) {
          model.score += 40 * model.combo;
          if (model.messageTimer < 0.4) notify(model, `${jumped ? "Clean jump" : "Clean slide"} · +${40 * model.combo}`, 0.8);
        } else if (model.burstTimer > 0) {
          entity.active = false;
          model.score += 60 * model.combo;
          events |= EVENT_BURST;
          if (!reducedMotion) emitParticles(model, entity.lane, "signal", 12);
        } else if (model.invulnerabilityTimer === 0) {
          entity.active = false;
          resetStreak(model);
          model.invulnerabilityTimer = 1.3;
          if (model.shield > 0) {
            model.shield = 0;
            notify(model, "Shield absorbed the hit");
            events |= EVENT_SHIELD;
          } else {
            model.hull -= 1;
            if (model.hull > 0) {
              notify(model, "One life left · keep going", 2);
              events |= EVENT_DAMAGE;
            } else {
              model.endCause = entity.kind === "block"
                ? "A train blocked your lane. Switch lanes to pass."
                : entity.kind === "barrier"
                  ? "Caught a low barrier. Jump before it reaches you."
                  : "Caught a high gate. Slide underneath with Down.";
              events |= EVENT_IMPACT;
            }
          }
          if (!reducedMotion) emitParticles(model, entity.lane, "ink", 18);
        }
      }
    }
    if (entity.z < -0.12) entity.active = false;
    if (events & EVENT_IMPACT) break;
  }

  for (const particle of model.particles) {
    if (!particle.active) continue;
    particle.life -= delta;
    if (particle.life <= 0) { particle.active = false; continue; }
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 0.32 * delta;
  }
  return events;
}

/** Mutates a bounded pool; long frames are capped so a hidden tab cannot teleport. */
export function updateModel(model: RunnerModel, delta: number, reducedMotion: boolean): number {
  if (!Number.isFinite(delta) || delta <= 0 || model.hull <= 0) return 0;
  let remaining = Math.min(delta, 0.1);
  let events = 0;
  while (remaining > 1e-8) {
    const step = Math.min(FIXED_STEP, remaining);
    events |= updateStep(model, step, reducedMotion);
    remaining -= step;
    if (events & EVENT_IMPACT) break;
  }
  return events;
}
