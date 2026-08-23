"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "../styles/railshift-lab.css";

type Lane = -1 | 0 | 1;
type RunnerStatus = "idle" | "playing" | "paused" | "crashed";
type EntityKind = "barrier" | "gantry" | "block" | "cell" | "shield";

type TrackEntity = {
  active: boolean;
  checked: boolean;
  kind: EntityKind;
  lane: Lane;
  z: number;
};

type Particle = {
  active: boolean;
  color: "ink" | "signal";
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type RunnerModel = {
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
  lastSafeLane: Lane;
  entities: TrackEntity[];
  particles: Particle[];
};

type CanvasMetrics = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  carbon: string;
  ivory: string;
  cobalt: string;
  signal: string;
  background: CanvasGradient;
  projectionA: Float64Array;
  projectionB: Float64Array;
};

type RunnerHud = {
  score: number;
  distance: number;
  combo: number;
  cells: number;
  shield: number;
  fps: number;
};

type RailshiftLabProps = {
  isActive: boolean;
  prefersReducedMotion: boolean;
  themeId: string;
};

const BEST_SCORE_KEY = "sam-workbench-railshift-best-v1";
const BEST_DISTANCE_KEY = "sam-workbench-railshift-best-distance-v1";
const ENTITY_POOL_SIZE = 72;
const PARTICLE_POOL_SIZE = 42;
const FIXED_STEP = 1 / 60;
const EVENT_CELL = 1;
const EVENT_SHIELD = 2;
const EVENT_IMPACT = 4;

const EMPTY_HUD: RunnerHud = {
  score: 0,
  distance: 0,
  combo: 1,
  cells: 0,
  shield: 0,
  fps: 60,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function asLane(value: number): Lane {
  return clamp(Math.round(value), -1, 1) as Lane;
}

function random(model: RunnerModel) {
  model.seed = (Math.imul(model.seed, 1_664_525) + 1_013_904_223) >>> 0;
  return model.seed / 4_294_967_296;
}

function makeEntities(): TrackEntity[] {
  return Array.from({ length: ENTITY_POOL_SIZE }, () => ({
    active: false,
    checked: false,
    kind: "cell" as const,
    lane: 0 as Lane,
    z: 0,
  }));
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    active: false,
    color: "signal" as const,
    life: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }));
}

function initialModel(): RunnerModel {
  return {
    lane: 0,
    laneVisual: 0,
    jump: 0,
    jumpVelocity: 0,
    duckTimer: 0,
    speed: 0.32,
    distance: 0,
    score: 0,
    cells: 0,
    combo: 1,
    shield: 0,
    elapsed: 0,
    spawnTimer: 0.55,
    rows: 0,
    seed: (Date.now() ^ 0x9e3779b9) >>> 0,
    lastSafeLane: 0,
    entities: makeEntities(),
    particles: makeParticles(),
  };
}

function spawnEntity(
  model: RunnerModel,
  kind: EntityKind,
  lane: Lane,
  z: number,
) {
  const entity = model.entities.find((candidate) => !candidate.active);
  if (!entity) return;
  entity.active = true;
  entity.checked = false;
  entity.kind = kind;
  entity.lane = lane;
  entity.z = z;
}

function chooseLane(model: RunnerModel): Lane {
  return ([-1, 0, 1] as const)[Math.floor(random(model) * 3)];
}

function chooseReachableSafeLane(model: RunnerModel): Lane {
  const options = ([-1, 0, 1] as const).filter(
    (lane) => Math.abs(lane - model.lastSafeLane) <= 1,
  );
  return options[Math.floor(random(model) * options.length)] ?? 0;
}

function spawnRow(model: RunnerModel) {
  const far = 1.12;
  const roll = random(model);
  model.rows += 1;

  if (model.rows % 9 === 0 && model.shield === 0) {
    const lane = chooseLane(model);
    spawnEntity(model, "shield", lane, far);
    spawnEntity(model, "cell", lane, far + 0.13);
    model.lastSafeLane = lane;
  } else if (roll < 0.2) {
    const lane = chooseLane(model);
    for (let index = 0; index < 4; index += 1) {
      spawnEntity(model, "cell", lane, far + index * 0.12);
    }
    model.lastSafeLane = lane;
  } else if (roll < 0.42) {
    const lane = chooseLane(model);
    spawnEntity(model, "barrier", lane, far);
    spawnEntity(model, "cell", lane, far + 0.08);
    spawnEntity(model, "cell", lane, far + 0.18);
    model.lastSafeLane = lane;
  } else if (roll < 0.62) {
    const lane = chooseLane(model);
    spawnEntity(model, "gantry", lane, far);
    spawnEntity(model, "cell", lane, far + 0.07);
    spawnEntity(model, "cell", lane, far + 0.17);
    model.lastSafeLane = lane;
  } else if (roll < 0.86) {
    const safeLane = chooseReachableSafeLane(model);
    for (const lane of [-1, 0, 1] as const) {
      spawnEntity(model, lane === safeLane ? "cell" : "block", lane, far);
    }
    spawnEntity(model, "cell", safeLane, far + 0.14);
    model.lastSafeLane = safeLane;
  } else {
    const firstLane = chooseLane(model);
    const secondLane = asLane(firstLane === 1 ? 0 : firstLane + 1);
    spawnEntity(model, "cell", firstLane, far);
    spawnEntity(model, "cell", secondLane, far + 0.15);
    spawnEntity(model, "cell", firstLane, far + 0.3);
    model.lastSafeLane = firstLane;
  }

  const worldGap = model.rows < 4 ? 0.42 : 0.34;
  model.spawnTimer = clamp(worldGap / model.speed, 0.48, 1.15);
}

function emitParticles(
  model: RunnerModel,
  lane: number,
  color: Particle["color"],
  count: number,
) {
  let emitted = 0;
  for (const particle of model.particles) {
    if (particle.active) continue;
    const angle = random(model) * Math.PI * 2;
    const force = 0.05 + random(model) * 0.13;
    particle.active = true;
    particle.color = color;
    particle.life = 0.42 + random(model) * 0.24;
    particle.x = 0.5 + lane * 0.18;
    particle.y = 0.73;
    particle.vx = Math.cos(angle) * force;
    particle.vy = Math.sin(angle) * force - 0.12;
    emitted += 1;
    if (emitted >= count) break;
  }
}

function updateParticles(model: RunnerModel, delta: number) {
  for (const particle of model.particles) {
    if (!particle.active) continue;
    particle.life -= delta;
    if (particle.life <= 0) {
      particle.active = false;
      continue;
    }
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 0.32 * delta;
  }
}

function updateModel(
  model: RunnerModel,
  delta: number,
  prefersReducedMotion: boolean,
) {
  let events = 0;
  model.elapsed += delta;
  model.distance += model.speed * delta * 66;
  model.speed = clamp(0.32 + model.distance * 0.00028, 0.32, 0.7);
  model.score += model.speed * delta * 125 * model.combo;
  model.laneVisual += (model.lane - model.laneVisual) * Math.min(1, delta * 13);

  if (model.jump > 0 || model.jumpVelocity > 0) {
    model.jumpVelocity -= 5.8 * delta;
    model.jump += model.jumpVelocity * delta;
    if (model.jump <= 0) {
      model.jump = 0;
      model.jumpVelocity = 0;
    }
  }
  model.duckTimer = Math.max(0, model.duckTimer - delta);
  model.spawnTimer -= delta;
  if (model.spawnTimer <= 0) spawnRow(model);

  for (const entity of model.entities) {
    if (!entity.active) continue;
    entity.z -= model.speed * delta;

    if (!entity.checked && entity.z <= 0.13) {
      entity.checked = true;
      const inLane = Math.abs(entity.lane - model.laneVisual) < 0.48;
      if (entity.kind === "cell") {
        if (inLane) {
          entity.active = false;
          model.cells += 1;
          model.combo = Math.min(5, 1 + Math.floor(model.cells / 6));
          model.score += 24 * model.combo;
          events |= EVENT_CELL;
          if (!prefersReducedMotion) emitParticles(model, entity.lane, "signal", 7);
        }
      } else if (entity.kind === "shield") {
        if (inLane) {
          entity.active = false;
          model.shield = 1;
          model.score += 80;
          events |= EVENT_SHIELD;
          if (!prefersReducedMotion) emitParticles(model, entity.lane, "ink", 12);
        }
      } else if (inLane) {
        const clearedBarrier = entity.kind === "barrier" && model.jump > 0.3;
        const clearedGantry =
          entity.kind === "gantry" && model.duckTimer > 0.06 && model.jump < 0.17;
        if (!clearedBarrier && !clearedGantry) {
          if (model.shield > 0) {
            model.shield = 0;
            entity.active = false;
            model.combo = Math.max(1, model.combo - 1);
            events |= EVENT_SHIELD;
            if (!prefersReducedMotion) emitParticles(model, entity.lane, "ink", 16);
          } else {
            events |= EVENT_IMPACT;
            if (!prefersReducedMotion) emitParticles(model, entity.lane, "ink", 24);
          }
        }
      }
    }

    if (entity.z < -0.12) {
      if (entity.kind === "cell" && !entity.checked) model.combo = 1;
      entity.active = false;
    }
  }

  updateParticles(model, delta);
  return events;
}

function configureCanvas(
  canvas: HTMLCanvasElement,
  host: HTMLDivElement,
): CanvasMetrics | null {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const area = width * height;
  const ratioCap = area > 650_000 ? 1.5 : 2;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, ratioCap);
  const pixelWidth = Math.round(width * pixelRatio);
  const pixelHeight = Math.round(height * pixelRatio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const style = window.getComputedStyle(host);
  const carbon = style.getPropertyValue("--carbon").trim() || "#11110f";
  const ivory = style.getPropertyValue("--ivory").trim() || "#f0efe8";
  const cobalt = style.getPropertyValue("--cobalt").trim() || "#4c5ce5";
  const signal = style.getPropertyValue("--signal").trim() || "#59df79";
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, carbon);
  background.addColorStop(0.58, cobalt);
  background.addColorStop(1, carbon);

  return {
    context,
    width,
    height,
    carbon,
    ivory,
    cobalt,
    signal,
    background,
    projectionA: new Float64Array(4),
    projectionB: new Float64Array(4),
  };
}

function project(
  metrics: CanvasMetrics,
  lane: number,
  z: number,
  output = metrics.projectionA,
) {
  const depth = clamp(1 - z, 0, 1.08);
  const perspective = depth * depth;
  const horizon = metrics.height * 0.19;
  const trackBottom = metrics.height * 0.95;
  const halfWidth = metrics.width * (0.045 + perspective * 0.37);
  output[0] = metrics.width * 0.5 + lane * halfWidth * 0.61;
  output[1] = horizon + (trackBottom - horizon) * perspective;
  output[2] = 0.14 + perspective * 1.04;
  output[3] = perspective;
  return output;
}

function drawTrack(
  metrics: CanvasMetrics,
  model: RunnerModel,
  prefersReducedMotion: boolean,
) {
  const { context, width, height, carbon, ivory, cobalt, signal } = metrics;
  context.fillStyle = metrics.background;
  context.fillRect(0, 0, width, height);

  const horizon = height * 0.19;
  context.fillStyle = carbon;
  for (let index = 0; index < 12; index += 1) {
    const blockWidth = width / 12 + 1;
    const blockHeight = height * (0.045 + ((index * 19) % 7) * 0.012);
    context.fillRect(index * blockWidth, horizon - blockHeight, blockWidth, blockHeight);
  }

  context.fillStyle = carbon;
  context.beginPath();
  context.moveTo(width * 0.455, horizon);
  context.lineTo(width * 0.055, height);
  context.lineTo(width * 0.945, height);
  context.lineTo(width * 0.545, horizon);
  context.closePath();
  context.fill();

  context.strokeStyle = ivory;
  context.globalAlpha = 0.36;
  context.lineWidth = 1;
  for (const laneEdge of [-1.5, -0.5, 0.5, 1.5]) {
    const far = project(metrics, laneEdge, 1, metrics.projectionA);
    const near = project(metrics, laneEdge, 0, metrics.projectionB);
    context.beginPath();
    context.moveTo(far[0], far[1]);
    context.lineTo(near[0], near[1]);
    context.stroke();
  }

  const tieOffset = (model.distance * 0.013) % 0.1;
  for (let index = 0; index < 13; index += 1) {
    const z = index / 12 + tieOffset;
    if (z > 1) continue;
    const left = project(metrics, -1.55, z, metrics.projectionA);
    const right = project(metrics, 1.55, z, metrics.projectionB);
    context.globalAlpha = 0.12 + left[3] * 0.36;
    context.beginPath();
    context.moveTo(left[0], left[1]);
    context.lineTo(right[0], right[1]);
    context.stroke();
  }
  context.globalAlpha = 1;

  context.fillStyle = signal;
  context.fillRect(width * 0.5 - 1, horizon - 11, 2, 11);
  context.fillStyle = ivory;
  context.fillRect(width * 0.5 - 3, horizon - 14, 6, 3);

  if (model.speed > 0.36 && !prefersReducedMotion) {
    context.strokeStyle = cobalt;
    context.globalAlpha = clamp((model.speed - 0.34) * 0.65, 0.08, 0.24);
    for (let index = 0; index < 8; index += 1) {
      const x = ((index * 137 + model.elapsed * 280) % (width + 100)) - 50;
      const y = height * (0.28 + ((index * 31) % 60) / 100);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - 28 - model.speed * 40, y + 34);
      context.stroke();
    }
    context.globalAlpha = 1;
  }
}

function drawEntity(metrics: CanvasMetrics, entity: TrackEntity) {
  const { context, carbon, ivory, cobalt, signal } = metrics;
  const point = project(metrics, entity.lane, entity.z);
  if (point[3] <= 0.001) return;
  const scale = point[2];

  context.save();
  context.translate(point[0], point[1]);
  context.globalAlpha = clamp(point[3] * 1.7, 0.25, 1);

  if (entity.kind === "cell") {
    const size = 8 * scale;
    context.rotate(Math.PI / 4);
    context.fillStyle = signal;
    context.fillRect(-size, -size, size * 2, size * 2);
    context.fillStyle = carbon;
    context.fillRect(-size * 0.32, -size * 0.32, size * 0.64, size * 0.64);
  } else if (entity.kind === "shield") {
    const radius = 17 * scale;
    context.strokeStyle = signal;
    context.lineWidth = Math.max(2, 3 * scale);
    context.beginPath();
    for (let side = 0; side < 6; side += 1) {
      const angle = Math.PI / 3 * side - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (side === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.stroke();
    context.fillStyle = ivory;
    context.fillRect(-2 * scale, -8 * scale, 4 * scale, 16 * scale);
    context.fillRect(-8 * scale, -2 * scale, 16 * scale, 4 * scale);
  } else if (entity.kind === "barrier") {
    const width = 47 * scale;
    const height = 23 * scale;
    context.fillStyle = signal;
    context.fillRect(-width / 2, -height, width, height);
    context.fillStyle = carbon;
    context.fillRect(-width * 0.32, -height, width * 0.12, height);
    context.fillRect(width * 0.2, -height, width * 0.12, height);
    context.fillRect(-width * 0.42, 0, width * 0.11, height * 0.42);
    context.fillRect(width * 0.31, 0, width * 0.11, height * 0.42);
  } else if (entity.kind === "gantry") {
    const width = 52 * scale;
    const height = 72 * scale;
    const beam = 13 * scale;
    context.fillStyle = ivory;
    context.fillRect(-width / 2, -height, beam, height);
    context.fillRect(width / 2 - beam, -height, beam, height);
    context.fillStyle = signal;
    context.fillRect(-width / 2, -height, width, beam);
    context.fillStyle = carbon;
    context.fillRect(-width * 0.18, -height, width * 0.1, beam);
    context.fillRect(width * 0.08, -height, width * 0.1, beam);
  } else {
    const width = 50 * scale;
    const height = 68 * scale;
    context.fillStyle = ivory;
    context.fillRect(-width / 2, -height, width, height);
    context.fillStyle = cobalt;
    context.fillRect(-width * 0.31, -height * 0.72, width * 0.62, height * 0.31);
    context.fillStyle = signal;
    context.fillRect(-width * 0.3, -height * 0.18, width * 0.16, height * 0.08);
    context.fillRect(width * 0.14, -height * 0.18, width * 0.16, height * 0.08);
  }
  context.restore();
}

function drawRunner(metrics: CanvasMetrics, model: RunnerModel) {
  const { context, carbon, ivory, cobalt, signal, height } = metrics;
  const point = project(metrics, model.laneVisual, 0.055);
  const jumpOffset = model.jump * height * 0.22;
  const ducking = model.duckTimer > 0;
  const bodyHeight = ducking ? 24 : 48;

  context.save();
  context.translate(point[0], point[1]);
  context.globalAlpha = 0.32;
  context.fillStyle = carbon;
  context.beginPath();
  context.ellipse(0, 2, ducking ? 31 : 24, 7, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.translate(0, -jumpOffset);

  if (model.shield > 0) {
    context.strokeStyle = signal;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, -bodyHeight * 0.54, ducking ? 32 : 36, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = signal;
  context.fillRect(-28, -4, 56, 7);
  context.fillStyle = carbon;
  context.fillRect(-19, 3, 8, 4);
  context.fillRect(11, 3, 8, 4);

  context.rotate((model.lane - model.laneVisual) * 0.09);
  context.fillStyle = ivory;
  context.fillRect(ducking ? -20 : -12, -bodyHeight, ducking ? 40 : 24, bodyHeight - 5);
  context.fillStyle = cobalt;
  context.fillRect(ducking ? -15 : -8, -bodyHeight + 7, ducking ? 30 : 16, 14);
  context.fillStyle = signal;
  context.fillRect(ducking ? 10 : -7, -bodyHeight - 11, 14, 11);
  context.fillStyle = carbon;
  context.fillRect(ducking ? 14 : -3, -bodyHeight - 7, 3, 3);
  context.restore();
}

function drawParticles(metrics: CanvasMetrics, model: RunnerModel) {
  const { context, width, height, ivory, signal } = metrics;
  for (const particle of model.particles) {
    if (!particle.active) continue;
    context.globalAlpha = clamp(particle.life * 2.2, 0, 1);
    context.fillStyle = particle.color === "signal" ? signal : ivory;
    const size = 2 + particle.life * 4;
    context.fillRect(particle.x * width - size / 2, particle.y * height - size / 2, size, size);
  }
  context.globalAlpha = 1;
}

function drawScene(
  metrics: CanvasMetrics,
  model: RunnerModel,
  status: RunnerStatus,
  prefersReducedMotion: boolean,
) {
  drawTrack(metrics, model, prefersReducedMotion);
  for (let band = 10; band >= 0; band -= 1) {
    for (const entity of model.entities) {
      if (!entity.active) continue;
      const entityBand = Math.floor(clamp(entity.z, 0, 1) * 10);
      if (entityBand === band) drawEntity(metrics, entity);
    }
  }
  drawRunner(metrics, model);
  if (!prefersReducedMotion) drawParticles(metrics, model);

  if (status === "crashed") {
    const { context, width, height, signal } = metrics;
    context.globalAlpha = 0.11;
    context.fillStyle = signal;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;
  }
}

function hudFromModel(model: RunnerModel, fps: number): RunnerHud {
  return {
    score: Math.floor(model.score),
    distance: Math.floor(model.distance),
    combo: model.combo,
    cells: model.cells,
    shield: model.shield,
    fps: Math.round(fps),
  };
}

export default function RailshiftLab({
  isActive,
  prefersReducedMotion,
  themeId,
}: RailshiftLabProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metricsRef = useRef<CanvasMetrics | null>(null);
  const [initialGame] = useState(initialModel);
  const modelRef = useRef<RunnerModel>(initialGame);
  const statusRef = useRef<RunnerStatus>("idle");
  const soundEnabledRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const gestureRef = useRef({ x: 0, y: 0, pointerId: -1 });
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [hud, setHud] = useState<RunnerHud>(EMPTY_HUD);
  const [best, setBest] = useState(0);
  const [bestDistance, setBestDistance] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const commitStatus = useCallback((next: RunnerStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const playTone = useCallback(
    (frequency: number, duration = 0.08, volume = 0.025) => {
      if (!soundEnabledRef.current) return;
      try {
        const audio = audioRef.current ?? new AudioContext();
        audioRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const now = audio.currentTime;
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + duration);
      } catch {
        soundEnabledRef.current = false;
        setSoundEnabled(false);
      }
    },
    [],
  );

  const redraw = useCallback(() => {
    const metrics = metricsRef.current;
    if (!metrics) return;
    drawScene(metrics, modelRef.current, statusRef.current, prefersReducedMotion);
  }, [prefersReducedMotion]);

  useEffect(() => {
    let hydrationFrame = 0;
    try {
      const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY));
      if (Number.isFinite(saved) && saved > 0) {
        hydrationFrame = window.requestAnimationFrame(() => setBest(saved));
      }
      const savedDistance = Number(
        window.localStorage.getItem(BEST_DISTANCE_KEY),
      );
      if (Number.isFinite(savedDistance) && savedDistance > 0) {
        hydrationFrame = window.requestAnimationFrame(() =>
          setBestDistance(savedDistance),
        );
      }
    } catch {
      // Railshift remains playable when local storage is unavailable.
    }
    return () => window.cancelAnimationFrame(hydrationFrame);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    let resizeFrame = 0;
    const configure = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        metricsRef.current = configureCanvas(canvas, host);
        redraw();
      });
    };
    configure();
    const observer = new ResizeObserver(configure);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(resizeFrame);
    };
  }, [redraw, themeId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) void audioRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (status !== "playing" || !isActive) {
      redraw();
      return;
    }

    let frame = 0;
    let lastTimestamp = performance.now();
    let accumulator = 0;
    let lastHudUpdate = 0;
    let smoothedFps = 60;

    const finishRun = () => {
      const model = modelRef.current;
      const finalScore = Math.floor(model.score);
      commitStatus("crashed");
      setHud(hudFromModel(model, smoothedFps));
      setBest((current) => {
        const next = Math.max(current, finalScore);
        try {
          window.localStorage.setItem(BEST_SCORE_KEY, String(next));
        } catch {
          // Best-score persistence is optional.
        }
        return next;
      });
      setBestDistance((current) => {
        const next = Math.max(current, Math.floor(model.distance));
        try {
          window.localStorage.setItem(BEST_DISTANCE_KEY, String(next));
        } catch {
          // Best-distance persistence is optional.
        }
        return next;
      });
      playTone(82, 0.24, 0.045);
    };

    const loop = (timestamp: number) => {
      frame = 0;
      const rawDelta = Math.min(0.1, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      if (rawDelta > 0) {
        const instantaneousFps = 1 / rawDelta;
        smoothedFps += (instantaneousFps - smoothedFps) * 0.08;
      }
      accumulator = Math.min(accumulator + rawDelta, FIXED_STEP * 5);

      let steps = 0;
      let events = 0;
      while (accumulator >= FIXED_STEP && steps < 5) {
        events |= updateModel(modelRef.current, FIXED_STEP, prefersReducedMotion);
        accumulator -= FIXED_STEP;
        steps += 1;
        if (events & EVENT_IMPACT) break;
      }

      if (events & EVENT_CELL) playTone(520 + modelRef.current.combo * 70, 0.055);
      if (events & EVENT_SHIELD) playTone(220, 0.14, 0.035);
      redraw();

      if (events & EVENT_IMPACT) {
        finishRun();
        return;
      }

      if (timestamp - lastHudUpdate > 110) {
        lastHudUpdate = timestamp;
        setHud(hudFromModel(modelRef.current, smoothedFps));
      }
      if (statusRef.current === "playing" && document.visibilityState === "visible") {
        frame = window.requestAnimationFrame(loop);
      }
    };

    const startLoop = () => {
      if (document.visibilityState !== "visible" || frame) return;
      lastTimestamp = performance.now();
      accumulator = 0;
      frame = window.requestAnimationFrame(loop);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") startLoop();
      else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    startLoop();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [commitStatus, isActive, playTone, prefersReducedMotion, redraw, status]);

  const startRun = useCallback(() => {
    modelRef.current = initialModel();
    setHud(EMPTY_HUD);
    commitStatus("playing");
    window.requestAnimationFrame(() => {
      surfaceRef.current?.focus({ preventScroll: true });
    });
  }, [commitStatus]);

  const pauseOrResume = useCallback(() => {
    if (statusRef.current === "playing") {
      commitStatus("paused");
    } else if (statusRef.current === "paused") {
      commitStatus("playing");
      window.requestAnimationFrame(() => surfaceRef.current?.focus({ preventScroll: true }));
    }
  }, [commitStatus]);

  const moveLane = useCallback(
    (direction: -1 | 1) => {
      if (statusRef.current !== "playing") return;
      const model = modelRef.current;
      const nextLane = asLane(model.lane + direction);
      if (nextLane === model.lane) return;
      model.lane = nextLane;
      playTone(150 + (nextLane + 1) * 30, 0.035, 0.014);
    },
    [playTone],
  );

  const jump = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const model = modelRef.current;
    if (model.jump > 0.03) return;
    model.duckTimer = 0;
    model.jumpVelocity = 2.28;
    playTone(310, 0.07, 0.018);
  }, [playTone]);

  const duck = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const model = modelRef.current;
    model.duckTimer = 0.62;
    if (model.jump > 0.05) model.jumpVelocity = Math.min(model.jumpVelocity, -1.9);
    playTone(118, 0.06, 0.018);
  }, [playTone]);

  const toggleSound = useCallback(() => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    if (next) {
      try {
        const audio = audioRef.current ?? new AudioContext();
        audioRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
      } catch {
        soundEnabledRef.current = false;
        setSoundEnabled(false);
        return;
      }
      window.setTimeout(() => playTone(440, 0.06, 0.02), 0);
    }
  }, [playTone]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    const handled = [
      "arrowleft",
      "arrowright",
      "arrowup",
      "arrowdown",
      "a",
      "d",
      "w",
      "s",
      "p",
      "enter",
      " ",
    ].includes(key);
    if (!handled) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;

    if (key === "enter" && statusRef.current !== "playing") {
      if (statusRef.current === "paused") pauseOrResume();
      else startRun();
    } else if (key === "p") {
      pauseOrResume();
    } else if (key === "arrowleft" || key === "a") {
      moveLane(-1);
    } else if (key === "arrowright" || key === "d") {
      moveLane(1);
    } else if (key === "arrowdown" || key === "s") {
      duck();
    } else if (key === "arrowup" || key === "w" || key === " ") {
      if (statusRef.current === "idle" || statusRef.current === "crashed") startRun();
      else jump();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    gestureRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.x;
    const deltaY = event.clientY - gesture.y;
    gestureRef.current.pointerId = -1;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) {
      jump();
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      moveLane(deltaX < 0 ? -1 : 1);
    } else if (deltaY < 0) {
      jump();
    } else {
      duck();
    }
  };

  const statusMessage =
    status === "crashed"
      ? `Run ended at ${hud.distance} metres with ${hud.score} points.`
      : status === "paused"
        ? "Run paused."
        : status === "playing"
          ? "Run in progress."
          : "Line ready.";

  return (
    <div ref={hostRef} className="railshift">
      <header className="railshift__header">
        <div className="railshift__identity">
          <h2>Railshift</h2>
          <span>Three-lane signal lab</span>
        </div>
        <p>Read the route. Change lanes. Keep the signal.</p>
        <div className="railshift__header-actions">
          <button
            type="button"
            aria-pressed={soundEnabled}
            onClick={toggleSound}
          >
            Sound {soundEnabled ? "on" : "off"}
          </button>
          <button
            type="button"
            disabled={status === "idle" || status === "crashed"}
            onClick={pauseOrResume}
          >
            {status === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      <div
        ref={surfaceRef}
        className={`railshift__surface is-${status}`}
        role="group"
        aria-roledescription="game"
        aria-label="Railshift three-lane signal runner. Use Left and Right to change lanes, Up or Space to jump, Down to duck, and P to pause."
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown A D W S Space P Enter"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          gestureRef.current.pointerId = -1;
        }}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="railshift__hud" aria-hidden="true">
          <span><small>Score</small>{hud.score.toLocaleString()}</span>
          <span><small>Route</small>{hud.distance}m</span>
          <span className="railshift__combo"><small>Flow</small>×{hud.combo}</span>
          <span><small>Cells</small>{hud.cells}</span>
          <span><small>Guard</small>{hud.shield ? "Armed" : "Open"}</span>
        </div>

        {status !== "playing" && (
          <div className="railshift__overlay">
            <strong>
              {status === "crashed"
                ? "Signal broken."
                : status === "paused"
                  ? "Route held."
                  : "Line is clear."}
            </strong>
            <p>
              {status === "crashed"
                ? `${hud.distance}m · ${hud.score.toLocaleString()} points · best ${best.toLocaleString()} pts / ${bestDistance.toLocaleString()}m`
                : status === "paused"
                  ? "Your run is frozen exactly where you left it."
                  : "Build flow by collecting cells. Jump barriers, duck gantries, and switch away from blocks."}
            </p>
            <button
              type="button"
              onClick={status === "paused" ? pauseOrResume : startRun}
            >
              {status === "crashed"
                ? "Run again"
                : status === "paused"
                  ? "Resume run"
                  : "Start shift"}
            </button>
          </div>
        )}

        <div className="railshift__touch-controls" aria-label="Touch controls">
          <button type="button" aria-label="Move left" onClick={() => moveLane(-1)}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M20 12H5M10 7l-5 5 5 5" />
            </svg>
          </button>
          <button type="button" aria-label="Jump" onClick={jump}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 20V5m-5 5 5-5 5 5" />
            </svg>
          </button>
          <button type="button" aria-label="Duck" onClick={duck}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 4v15m-5-5 5 5 5-5" />
            </svg>
          </button>
          <button type="button" aria-label="Move right" onClick={() => moveLane(1)}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 12h15m-5-5 5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>

      <footer className="railshift__footer">
        <span>Left / right lane · Up jump · Down duck · P pause</span>
        <span>Sim 60 Hz / {hud.fps} fps · Best {best.toLocaleString()} · saved here</span>
      </footer>
      <p className="railshift__announcement" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
