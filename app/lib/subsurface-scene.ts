// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import * as THREE from "three";
import { GATE_HALF_WIDTH, SUB_X, type DiveModel } from "./subsurface-engine";

export type DiveRenderer = { resize: () => void; draw: (model: DiveModel, reducedMotion: boolean) => void; dispose: () => void };

/** All geometry is original and procedural. No textures, models or postprocessing passes. */
export function createDiveRenderer(host: HTMLElement): DiveRenderer {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  } catch {
    canvas.remove();
    return createFallbackRenderer(host);
  }
  renderer.setClearColor(0x03171f);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x052632, 0.018);
  const camera = new THREE.OrthographicCamera(-12, 12, 7, -7, 0.1, 70);
  camera.position.set(0, 0, 24);
  camera.lookAt(0, 0, 0);
  let worldHeight = 14;
  let lastZone = -1;
  const worldWidth = 24;
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const material = <T extends THREE.Material>(value: T) => { materials.add(value); return value; };
  const geometry = <T extends THREE.BufferGeometry>(value: T) => { geometries.add(value); return value; };
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = geometry(new THREE.SphereGeometry(1, 20, 12));
  const ring = geometry(new THREE.TorusGeometry(0.3, 0.025, 5, 24));
  const rock = geometry(new THREE.DodecahedronGeometry(1, 0));
  const shell = material(new THREE.MeshStandardMaterial({ color: 0xf2c17b, roughness: 0.35, metalness: 0.25 }));
  const dark = material(new THREE.MeshStandardMaterial({ color: 0x163643, roughness: 0.45, metalness: 0.7 }));
  const bronze = material(new THREE.MeshStandardMaterial({ color: 0xf2a76a, roughness: 0.5, metalness: 0.4 }));
  const glass = material(new THREE.MeshStandardMaterial({ color: 0x6df4fa, emissive: 0x2fc5d2, emissiveIntensity: 1.3, roughness: 0.1, metalness: 0.4, fog: false }));
  const wall = material(new THREE.MeshStandardMaterial({ color: 0x24505b, roughness: 0.95, metalness: 0.15, flatShading: true }));
  const lamp = material(new THREE.MeshBasicMaterial({ color: 0x6bf3d8, fog: false }));
  const amber = material(new THREE.MeshBasicMaterial({ color: 0xffc884, fog: false }));
  const backdrop = material(new THREE.MeshStandardMaterial({ color: 0x133f49, roughness: 1, flatShading: true }));
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = scene) => {
    const result = new THREE.Mesh(g, m);
    parent.add(result);
    return result;
  };
  scene.add(new THREE.HemisphereLight(0xb2f2f8, 0x072533, 2.5));
  const sun = new THREE.DirectionalLight(0x9bffe8, 3.5);
  sun.position.set(-7, 10, 12);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x437be2, 2);
  rim.position.set(8, -4, -2);
  scene.add(rim);

  const waterMaterial = material(new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, zone: { value: 0 } },
    depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `varying vec2 vUv; uniform float time; uniform float zone;
      void main(){
        vec3 deep=mix(vec3(.008,.042,.07),vec3(.014,.026,.065),zone*.3);
        vec3 shallow=mix(vec3(.025,.24,.29),vec3(.045,.105,.21),zone*.3);
        vec3 c=mix(deep,shallow,pow(vUv.y,1.7));
        float beam=pow(max(0.,sin(vUv.x*19.+vUv.y*5.+sin(time*.11)*.4)),18.);
        c+=vec3(.09,.23,.2)*beam*pow(vUv.y,2.)*.65;
        float glow=exp(-length((vUv-vec2(.23,.65))*vec2(2.,1.))*3.);
        c+=vec3(.02,.08,.09)*glow;
        gl_FragColor=vec4(c,1.);
      }`,
  }));
  const water = mesh(geometry(new THREE.PlaneGeometry(1, 1)), waterMaterial);
  water.position.z = -22;
  const mountains = Array.from({ length: 18 }, (_, i) => {
    const item = mesh(rock, backdrop);
    item.position.set(-15 + i * 2, 0, -8 - (i % 3) * 2);
    item.rotation.z = i * 0.61;
    return item;
  });
  const ground = mesh(box, backdrop);
  ground.position.z = -1;

  const particlePositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i += 1) {
    particlePositions[i * 3] = ((i * 7.131) % 30) - 15;
    particlePositions[i * 3 + 1] = ((i * 3.732) % 20) - 10;
    particlePositions[i * 3 + 2] = -2 - ((i * 1.319) % 12);
  }
  const particleGeometry = geometry(new THREE.BufferGeometry());
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, material(new THREE.PointsMaterial({ color: 0x8cd4d1, size: 0.045, transparent: true, opacity: 0.45, depthWrite: false })));
  scene.add(particles);

  const craft = new THREE.Group();
  scene.add(craft);
  const body = mesh(sphere, shell, craft);
  body.scale.set(0.67, 0.25, 0.29);
  craft.rotation.y = -0.17;
  const nose = mesh(sphere, glass, craft);
  nose.position.set(0.42, 0.02, 0.12);
  nose.scale.set(0.26, 0.2, 0.24);
  const hatch = mesh(box, dark, craft);
  hatch.scale.set(0.34, 0.15, 0.26);
  hatch.position.set(-0.08, 0.29, 0);
  const mast = mesh(box, bronze, craft);
  mast.scale.set(0.045, 0.25, 0.05);
  mast.position.set(-0.13, 0.44, 0);
  const light = mesh(sphere, lamp, craft);
  light.scale.setScalar(0.05);
  light.position.set(-0.13, 0.58, 0);
  for (let i = 0; i < 3; i += 1) {
    const porthole = mesh(sphere, glass, craft);
    porthole.scale.setScalar(0.067);
    porthole.position.set(-0.26 + i * 0.18, 0.025, 0.29);
  }
  for (const side of [-1, 1]) {
    const skid = mesh(box, dark, craft);
    skid.scale.set(0.78, 0.06, 0.06);
    skid.position.set(-0.08, -0.33, side * 0.24);
    const fin = mesh(box, bronze, craft);
    fin.scale.set(0.23, 0.09, 0.65);
    fin.position.set(-0.52, side * 0.17, 0);
    fin.rotation.z = side * 0.25;
  }
  const propeller = new THREE.Group();
  propeller.position.x = -0.76;
  craft.add(propeller);
  const prop = mesh(box, bronze, propeller);
  prop.scale.set(0.045, 0.58, 0.08);
  const headlightMaterial = material(new THREE.MeshBasicMaterial({ color: 0xbfffe5, transparent: true, opacity: 0.045, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const headlight = mesh(geometry(new THREE.ConeGeometry(1, 4, 24, 1, true)), headlightMaterial, craft);
  headlight.rotation.z = Math.PI / 2;
  headlight.position.set(2.55, 0, -0.1);
  const shieldMaterial = material(new THREE.MeshBasicMaterial({ color: 0x8afdea, wireframe: true, transparent: true, opacity: 0.3, depthWrite: false }));
  const shield = mesh(geometry(new THREE.IcosahedronGeometry(0.9, 1)), shieldMaterial, craft);
  shield.scale.set(1, 0.7, 0.7);
  const sonarMaterial = material(new THREE.MeshBasicMaterial({ color: 0x89ffe1, transparent: true, opacity: 0, depthWrite: false }));
  const sonar = mesh(geometry(new THREE.TorusGeometry(1, 0.008, 4, 64)), sonarMaterial);
  sonar.position.z = 1;

  const gates = Array.from({ length: 18 }, () => {
    const group = new THREE.Group();
    scene.add(group);
    const upper = mesh(box, wall, group);
    const lower = mesh(box, wall, group);
    const upperEdge = mesh(box, lamp, group);
    const lowerEdge = mesh(box, lamp, group);
    const core = mesh(geometry(new THREE.OctahedronGeometry(0.16)), amber, group);
    const halo = mesh(ring, amber, group);
    const upperRock = mesh(rock, wall, group);
    const lowerRock = mesh(rock, wall, group);
    upper.rotation.y = -0.16;
    lower.rotation.y = -0.16;
    return { group, upper, lower, upperEdge, lowerEdge, core, halo, upperRock, lowerRock };
  });

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const cap = width < 650 || width * height > 900_000 ? 1.25 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    renderer.setSize(width, height, false);
    worldHeight = worldWidth * height / width;
    camera.top = worldHeight / 2;
    camera.bottom = -worldHeight / 2;
    camera.updateProjectionMatrix();
    water.scale.set(worldWidth * 1.2, worldHeight * 1.2, 1);
    ground.scale.set(40, worldHeight * 0.04, 4);
    ground.position.y = -worldHeight * 0.48;
    mountains.forEach((item, i) => {
      const side = i % 3 === 0 ? 1 : -1;
      item.position.y = side * worldHeight * (0.51 + (i % 4) * 0.012);
      item.scale.set(2 + (i % 3), worldHeight * (0.1 + (i % 4) * 0.035), 2);
    });
    particles.scale.y = worldHeight / 16;
    craft.scale.setScalar(Math.max(0.78, Math.min(1.6, worldHeight / 13)));
  };

  const draw = (model: DiveModel, reducedMotion: boolean) => {
    const time = reducedMotion ? 0 : model.elapsed;
    waterMaterial.uniforms.time!.value = time;
    waterMaterial.uniforms.zone!.value = model.zone;
    if (model.zone !== lastZone) {
      wall.color.setHex([0x24505b, 0x4f4259, 0x243959][model.zone]!);
      backdrop.color.setHex([0x133f49, 0x293244, 0x182d46][model.zone]!);
      lastZone = model.zone;
    }
    mountains.forEach((item, i) => {
      item.position.x = ((i * 2 - (reducedMotion ? 0 : model.distance * 1.4) + 72) % 36) - 18;
    });
    particles.position.x = reducedMotion ? 0 : -(model.distance * 3) % 5;
    const y = (0.5 - model.y) * worldHeight;
    craft.position.set((SUB_X - 0.5) * worldWidth, y, 1);
    craft.rotation.z = reducedMotion ? 0 : -model.velocity * 0.65;
    propeller.rotation.x = time * 25;
    shield.visible = model.invulnerable > 0;
    shield.rotation.x = time;
    shieldMaterial.opacity = model.sonar > 0 ? 0.4 : 0.17;
    sonar.position.set(craft.position.x, y, 1);
    sonar.scale.setScalar((1 - model.sonar) * 10 + 1);
    sonarMaterial.opacity = reducedMotion ? 0 : model.sonar * 0.45;
    for (const gate of model.gates) {
      const item = gates[gate.id]!;
      item.group.visible = gate.x > -0.12 && gate.x < 1.12;
      if (!item.group.visible) continue;
      item.group.position.x = (gate.x - 0.5) * worldWidth;
      const top = (gate.center - gate.halfGap) * worldHeight;
      const bottom = (1 - gate.center - gate.halfGap) * worldHeight;
      const gateWidth = GATE_HALF_WIDTH * 2 * worldWidth;
      item.upper.scale.set(gateWidth, top, 1.2);
      item.upper.position.y = worldHeight / 2 - top / 2;
      item.lower.scale.set(gateWidth, bottom, 1.2);
      item.lower.position.y = -worldHeight / 2 + bottom / 2;
      item.upperEdge.scale.set(gateWidth, 0.045, 1.23);
      item.upperEdge.position.y = worldHeight / 2 - top;
      item.lowerEdge.scale.set(gateWidth, 0.045, 1.23);
      item.lowerEdge.position.y = -worldHeight / 2 + bottom;
      item.upperRock.scale.set(gateWidth * 0.48, Math.max(0.6, top * 0.42), 1);
      item.upperRock.position.set(0, worldHeight / 2 - top / 2, -0.8);
      item.lowerRock.scale.set(gateWidth * 0.48, Math.max(0.6, bottom * 0.42), 1);
      item.lowerRock.position.set(0, -worldHeight / 2 + bottom / 2, -0.8);
      item.upperRock.rotation.y = gate.id * 1.1;
      item.lowerRock.rotation.y = gate.id * 1.7;
      item.core.visible = gate.sample;
      item.halo.visible = gate.sample;
      item.core.position.y = (0.5 - gate.center) * worldHeight;
      item.halo.position.y = item.core.position.y;
      item.core.material = gate.repair ? lamp : amber;
      item.halo.material = gate.repair ? lamp : amber;
      item.core.rotation.set(time * 0.6, time, 0);
      item.halo.rotation.y = time * 0.7;
    }
    renderer.render(scene, camera);
  };
  resize();
  return { resize, draw, dispose: () => { geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); } };
}

/** WebGL is optional: identical simulation and controls remain playable on a 2D surface. */
function createFallbackRenderer(host: HTMLElement): DiveRenderer {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });
  let width = 1;
  let height = 1;
  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = width * ratio; canvas.height = height * ratio;
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const draw = (model: DiveModel) => {
    if (!ctx) return;
    const water = ctx.createLinearGradient(0, 0, 0, height);
    water.addColorStop(0, "#0e4a58"); water.addColorStop(1, "#03131e");
    ctx.fillStyle = water; ctx.fillRect(0, 0, width, height);
    for (const gate of model.gates) {
      if (gate.x < -0.1 || gate.x > 1.1) continue;
      const x = (gate.x - GATE_HALF_WIDTH) * width;
      const top = (gate.center - gate.halfGap) * height;
      const bottom = (gate.center + gate.halfGap) * height;
      ctx.fillStyle = "#153b46";
      ctx.fillRect(x, 0, GATE_HALF_WIDTH * 2 * width, top);
      ctx.fillRect(x, bottom, GATE_HALF_WIDTH * 2 * width, height - bottom);
      ctx.fillStyle = "#77e5cb";
      ctx.fillRect(x, top - 2, GATE_HALF_WIDTH * 2 * width, 2);
      ctx.fillRect(x, bottom, GATE_HALF_WIDTH * 2 * width, 2);
      if (gate.sample) {
        ctx.strokeStyle = gate.repair ? "#77e5cb" : "#ffbf78";
        ctx.beginPath(); ctx.arc(gate.x * width, gate.center * height, 8, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.save(); ctx.translate(SUB_X * width, model.y * height);
    ctx.fillStyle = "#e7d4a6"; ctx.beginPath(); ctx.ellipse(0, 0, width * 0.032, Math.max(5, height * 0.018), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6ef3e2"; ctx.beginPath(); ctx.arc(width * 0.018, 0, 3, 0, Math.PI * 2); ctx.fill();
    if (model.invulnerable > 0) { ctx.strokeStyle = "#9efce7"; ctx.beginPath(); ctx.ellipse(0, 0, width * 0.05, Math.max(15, height * 0.035), 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  };
  resize();
  return { resize, draw, dispose: () => canvas.remove() };
}
