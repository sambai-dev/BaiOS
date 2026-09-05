// SPDX-License-Identifier: AGPL-3.0-or-later
// Original procedural scenery; no downloaded models or textures.
import * as THREE from "three";
import type { RunnerModel, EntityKind } from "./railshift-engine";
import { createRailshiftCity } from "./railshift-city";
import { createRailshiftBoard } from "./railshift-board";
import { createBoardTrick } from "./railshift-board-trick";
import { createRiderLegIK } from "./railshift-rider-ik";

export type RailshiftScene = {
  resize: (width: number, height: number) => void;
  draw: (model: RunnerModel, reducedMotion: boolean, idle: boolean) => void;
  dispose: () => void;
};

const LANE_WIDTH = 3.2;
const FAR_DISTANCE = 72;

/** One retained scene, shared geometry, pooled obstacles and instanced scenery. */
export function createRailshiftScene(canvas: HTMLCanvasElement): RailshiftScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#8daeb8");
  scene.fog = new THREE.Fog("#8daeb8", 30, 116);
  const camera = new THREE.PerspectiveCamera(53, 1, 0.1, 210);
  const skyLight = new THREE.HemisphereLight("#f6e8ce", "#46656a", 3.2);
  scene.add(skyLight);
  const sunlight = new THREE.DirectionalLight("#ffe8bd", 3.1);
  sunlight.position.set(-20, 30, -20);
  scene.add(sunlight);

  const box = new THREE.BoxGeometry(1, 1, 1);
  const round = new THREE.SphereGeometry(1, 12, 8);
  const ring = new THREE.TorusGeometry(0.36, 0.07, 5, 12);
  const materials: THREE.Material[] = [];
  const material = (color: string, emissive = "#000000") => {
    const next = new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.7, metalness: 0.12, flatShading: true });
    materials.push(next);
    return next;
  };
  const chalk = material("#e4e2ce");
  const concrete = material("#789197");
  const asphalt = material("#354f55");
  const dark = material("#16373d");
  const copper = material("#eb7a45");
  const yellow = material("#ffd37e", "#503416");
  const mint = material("#a6ffde", "#427b6a");
  const glass = material("#235969", "#102a31");
  const equipmentBlue = material("#5367c5");
  const coinMetal = material("#e7b139", "#49320b");
  const coinFace = new THREE.CylinderGeometry(0.33, 0.33, 0.09, 16);
  const magnetArc = new THREE.TorusGeometry(0.38, 0.13, 6, 14, Math.PI);
  const canister = new THREE.CylinderGeometry(0.18, 0.19, 0.74, 10);
  const nozzle = new THREE.CylinderGeometry(0.14, 0.11, 0.17, 10);
  const flameGeometry = new THREE.ConeGeometry(0.18, 1.1, 8);
  const flameMaterial = new THREE.MeshBasicMaterial({ color: "#ff9650", transparent: true, opacity: 0.86, depthWrite: false });
  const flameCoreMaterial = new THREE.MeshBasicMaterial({ color: "#fff0bd" });
  materials.push(flameMaterial, flameCoreMaterial);
  const block = (parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new THREE.Mesh(box, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  };
  const makeRocketPack = (powered: boolean) => {
    const pack = new THREE.Group();
    const flames = new THREE.Group();
    block(pack, equipmentBlue, 0, 0.58, 0, 0.29, 0.7, 0.35);
    block(pack, mint, 0, 0.64, 0.19, 0.1, 0.26, 0.025);
    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(canister, chalk);
      tank.position.set(side * 0.25, 0.56, 0);
      pack.add(tank);
      const cap = new THREE.Mesh(round, equipmentBlue);
      cap.position.set(side * 0.25, 0.94, 0);
      cap.scale.set(0.18, 0.18, 0.18);
      pack.add(cap);
      const outlet = new THREE.Mesh(nozzle, dark);
      outlet.position.set(side * 0.25, 0.11, 0);
      pack.add(outlet);
      block(pack, copper, side * 0.25, 0.48, 0.185, 0.22, 0.12, 0.04);
      if (powered) {
        const outer = new THREE.Mesh(flameGeometry, flameMaterial);
        outer.position.set(side * 0.25, -0.48, 0);
        outer.rotation.z = Math.PI;
        flames.add(outer);
        const inner = new THREE.Mesh(flameGeometry, flameCoreMaterial);
        inner.position.set(side * 0.25, -0.24, 0);
        inner.rotation.z = Math.PI;
        inner.scale.set(0.55, 0.58, 0.55);
        flames.add(inner);
      }
    }
    pack.add(flames);
    return { pack, flames };
  };
  const makeMagnet = () => {
    const group = new THREE.Group();
    const arc = new THREE.Mesh(magnetArc, equipmentBlue);
    arc.rotation.z = Math.PI;
    group.add(arc);
    for (const side of [-1, 1]) {
      block(group, side < 0 ? equipmentBlue : copper, side * 0.38, 0.19, 0, 0.26, 0.4, 0.26);
      block(group, chalk, side * 0.38, 0.43, 0, 0.27, 0.14, 0.27);
    }
    return group;
  };
  block(scene, asphalt, 0, -0.3, -48, 11.6, 0.6, 140);
  block(scene, dark, 0, -1, -48, 9, 1.4, 140);
  for (const side of [-1, 1]) {
    block(scene, chalk, side * 5.75, 0.1, -48, 0.25, 0.5, 140);
    block(scene, mint, side * 5.57, 0.23, -48, 0.045, 0.035, 140);
    for (const lane of [-1, 0, 1]) {
      block(scene, concrete, lane * LANE_WIDTH + side * 0.7, 0.025, -48, 0.07, 0.06, 140);
    }
  }

  const dummy = new THREE.Object3D();
  const ties = new THREE.InstancedMesh(box, concrete, 84);
  ties.frustumCulled = false;
  scene.add(ties);
  const trackLights = new THREE.InstancedMesh(box, mint, 44);
  trackLights.frustumCulled = false;
  scene.add(trackLights);

  const city = createRailshiftCity();
  scene.add(city.group);

  const arches = Array.from({ length: 6 }, (_, index) => {
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      block(group, chalk, side * 6.2, 3.8, 0, 0.3, 8, 0.45);
      const brace = block(group, chalk, side * 4.6, 7.95, 0, 3.24, 0.24, 0.4);
      brace.rotation.z = -side * 0.093;
      block(group, dark, side * 6.15, 4.6, 0.3, 0.5, 1.4, 0.3);
      block(group, mint, side * 6.15, 4.7, 0.48, 0.24, 0.75, 0.04);
    }
    block(group, chalk, 0, 8.1, 0, 6, 0.26, 0.45);
    block(group, dark, 0, 7.65, 0, 3.3, 0.65, 0.25);
    block(group, mint, 0, 7.65, 0.14, 1.7, 0.14, 0.015);
    group.position.z = -index * 23;
    scene.add(group);
    return group;
  });

  const buildEntity = (kind: EntityKind) => {
    const group = new THREE.Group();
    if (kind === "cell") {
      const face = new THREE.Mesh(coinFace, coinMetal);
      face.position.y = 1;
      face.rotation.x = Math.PI / 2;
      group.add(face);
      const coin = new THREE.Mesh(ring, yellow);
      coin.position.y = 1.0;
      group.add(coin);
      block(group, yellow, 0, 1, 0.065, 0.1, 0.37, 0.035);
    } else if (kind === "magnet") {
      const magnet = makeMagnet();
      magnet.position.y = 1.25;
      group.add(magnet);
      const halo = new THREE.Mesh(ring, mint);
      halo.rotation.x = -Math.PI / 2;
      halo.scale.setScalar(2.2);
      halo.position.y = 0.2;
      group.add(halo);
    } else if (kind === "jetpack") {
      const { pack } = makeRocketPack(false);
      pack.position.y = 0.45;
      pack.scale.setScalar(1.3);
      group.add(pack);
      const halo = new THREE.Mesh(ring, mint);
      halo.rotation.x = -Math.PI / 2;
      halo.scale.setScalar(2.5);
      halo.position.y = 0.2;
      group.add(halo);
      // Upward fins make the pickup legible even before its canisters are close.
      block(group, mint, 0, 1.95, 0, 0.1, 0.55, 0.1);
      block(group, mint, -0.13, 2.08, 0, 0.09, 0.4, 0.1).rotation.z = -0.7;
      block(group, mint, 0.13, 2.08, 0, 0.09, 0.4, 0.1).rotation.z = 0.7;
    } else if (kind === "shield") {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mint);
      core.position.y = 1.15;
      group.add(core);
      block(group, chalk, 0, 1.15, 0.46, 0.45, 0.12, 0.035);
      block(group, chalk, 0, 1.15, 0.46, 0.12, 0.45, 0.035);
    } else if (kind === "barrier") {
      block(group, copper, 0, 0.82, 0, 2.25, 0.62, 0.5);
      for (const x of [-0.84, 0.84]) block(group, dark, x, 0.35, 0, 0.2, 0.7, 0.3);
      for (const x of [-0.7, 0, 0.7]) block(group, chalk, x, 0.82, 0.26, 0.23, 0.53, 0.035).rotation.z = -0.38;
    } else if (kind === "gantry") {
      for (const x of [-1.1, 1.1]) block(group, dark, x, 1.3, 0, 0.18, 2.6, 0.3);
      block(group, copper, 0, 1.95, 0, 2.4, 1.15, 0.42);
      block(group, chalk, 0, 1.5, 0.22, 2.4, 0.12, 0.035);
      for (const x of [-0.7, 0, 0.7]) {
        const arrow = block(group, chalk, x - 0.08, 2.0, 0.22, 0.08, 0.35, 0.04);
        arrow.rotation.z = 0.5;
        block(group, chalk, x + 0.08, 2.0, 0.22, 0.08, 0.35, 0.04).rotation.z = -0.5;
      }
    } else {
      block(group, chalk, 0, 1.6, -0.5, 2.45, 2.8, 4.8);
      block(group, copper, 0, 0.7, -0.5, 2.5, 0.55, 4.84);
      block(group, glass, 0, 2.12, 1.91, 1.97, 1.05, 0.04);
      block(group, dark, 0, 2.12, 1.94, 0.075, 1.08, 0.04);
      for (const x of [-0.8, 0.8]) block(group, yellow, x, 0.84, 1.96, 0.28, 0.15, 0.055);
      block(group, dark, 0, 0.23, -0.5, 2.05, 0.26, 4.4);
      for (const side of [-1, 1]) {
        block(group, glass, side * 1.24, 2, -0.9, 0.025, 0.85, 2.7);
        block(group, chalk, side * 1.26, 2, -0.9, 0.035, 0.9, 0.12);
      }
    }
    return group;
  };
  const pools: Record<EntityKind, THREE.Group[]> = { cell: [], shield: [], jetpack: [], magnet: [], barrier: [], gantry: [], block: [] };
  const used = { cell: 0, shield: 0, jetpack: 0, magnet: 0, barrier: 0, gantry: 0, block: 0 };
  for (const kind of Object.keys(pools) as EntityKind[]) {
    const count = kind === "cell" ? 54 : kind === "shield" || kind === "jetpack" || kind === "magnet" ? 5 : 18;
    for (let index = 0; index < count; index++) {
      const group = buildEntity(kind);
      group.visible = false;
      scene.add(group);
      pools[kind].push(group);
    }
  }

  const rider = new THREE.Group();
  rider.name = "Cityline rider";
  const board = createRailshiftBoard({ rail: copper, grip: dark, light: mint, sole: asphalt });
  rider.add(board);
  const body = new THREE.Group();
  body.name = "Rider body";
  const riderHips: THREE.Group[] = [];
  const riderKnees: THREE.Group[] = [];
  const riderFeet: THREE.Group[] = [];
  const legSolvers: ReturnType<typeof createRiderLegIK>[] = [];
  const riderArms: THREE.Group[] = [];
  const riderElbows: THREE.Group[] = [];
  // Narrow trouser cuffs meet the shoes without their corners cutting into
  // the grip pads as the knees fold. Bone lengths remain unchanged.
  const shinGeometry = new THREE.BoxGeometry(0.2, 0.32, 0.24);
  const shinVertices = shinGeometry.getAttribute("position");
  for (let index = 0; index < shinVertices.count; index++) {
    if (shinVertices.getY(index) < 0) {
      shinVertices.setX(index, shinVertices.getX(index) * 0.65);
      shinVertices.setZ(index, shinVertices.getZ(index) * 0.45);
    }
  }
  shinGeometry.computeVertexNormals();
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.2, 0.9, 0);
    block(hip, dark, 0, -0.17, 0, 0.23, 0.34, 0.25);
    const knee = new THREE.Group();
    knee.position.y = -0.34;
    const shin = new THREE.Mesh(shinGeometry, dark);
    shin.position.y = -0.17;
    knee.add(shin);
    const foot = new THREE.Group();
    foot.name = side < 0 ? "Front planted shoe" : "Rear planted shoe";
    foot.position.y = -0.34;
    block(foot, chalk, 0, -0.04, -0.045, 0.26, 0.10, 0.38);
    block(foot, dark, 0, -0.095, -0.045, 0.27, 0.02, 0.39);
    knee.add(foot);
    hip.add(knee);
    body.add(hip);
    riderHips.push(hip);
    riderKnees.push(knee);
    riderFeet.push(foot);
    legSolvers.push(createRiderLegIK(hip, knee, foot, 0.34, 0.34));
  }
  const jacket = block(body, copper, 0, 1.16, 0, 0.69, 0.76, 0.42);
  jacket.rotation.x = -0.12;
  block(body, chalk, 0, 1.15, 0.25, 0.4, 0.53, 0.15);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.41, 1.46, 0);
    block(arm, copper, 0, -0.16, 0, 0.21, 0.32, 0.24);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    block(elbow, copper, 0, -0.14, 0, 0.18, 0.29, 0.22);
    block(elbow, dark, 0, -0.31, 0, 0.2, 0.18, 0.24);
    arm.add(elbow);
    body.add(arm);
    riderArms.push(arm);
    riderElbows.push(elbow);
  }
  const riderHead = new THREE.Group();
  riderHead.position.set(0, 1.85, -0.02);
  const helmet = new THREE.Mesh(round, chalk);
  helmet.scale.set(0.34, 0.34, 0.32);
  riderHead.add(helmet);
  block(riderHead, dark, 0, 0.03, -0.27, 0.47, 0.17, 0.08);
  block(riderHead, mint, 0, 0, 0.315, 0.25, 0.09, 0.025);
  body.add(riderHead);
  const rocket = makeRocketPack(true);
  rocket.pack.position.set(0, 0.67, 0.45);
  rocket.pack.scale.setScalar(0.95);
  rocket.pack.visible = false;
  body.add(rocket.pack);
  const equippedMagnet = makeMagnet();
  equippedMagnet.position.set(0.5, 0.88, 0.32);
  equippedMagnet.scale.setScalar(0.42);
  equippedMagnet.visible = false;
  body.add(equippedMagnet);
  rider.add(body);
  scene.add(rider);

  // An original dock warden: a helmet, utility coat and articulated sprint.
  // The opening pursuit is driven by run time; this never animates on the menu.
  const warden = new THREE.Group();
  const wardenTorso = new THREE.Group();
  block(wardenTorso, equipmentBlue, 0, 1.3, 0, 0.85, 0.93, 0.52);
  block(wardenTorso, chalk, 0, 1.22, 0.285, 0.66, 0.15, 0.04);
  block(wardenTorso, dark, 0, 0.93, 0, 0.88, 0.12, 0.57);
  block(wardenTorso, copper, 0.29, 1.63, 0.29, 0.14, 0.23, 0.04);
  const wardenHead = new THREE.Mesh(round, dark);
  wardenHead.position.set(0, 2.03, 0);
  wardenHead.scale.set(0.39, 0.4, 0.36);
  wardenTorso.add(wardenHead);
  block(wardenTorso, chalk, 0, 1.92, -0.28, 0.44, 0.2, 0.16);
  block(wardenTorso, mint, 0, 2.07, -0.34, 0.53, 0.14, 0.06);
  block(wardenTorso, copper, 0, 2.27, 0, 0.48, 0.055, 0.56);
  const wardenLegs: THREE.Group[] = [];
  const wardenArms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.24, 0.95, 0);
    block(leg, dark, 0, -0.35, 0, 0.27, 0.7, 0.29);
    block(leg, equipmentBlue, 0, -0.38, -0.17, 0.2, 0.22, 0.09);
    block(leg, dark, 0, -0.77, -0.1, 0.34, 0.2, 0.57);
    wardenLegs.push(leg);
    warden.add(leg);
    const arm = new THREE.Group();
    arm.position.set(side * 0.53, 1.6, 0);
    block(arm, equipmentBlue, 0, -0.29, 0, 0.25, 0.63, 0.25);
    block(arm, chalk, 0, -0.48, 0, 0.265, 0.12, 0.265);
    block(arm, dark, 0, -0.65, -0.08, 0.23, 0.23, 0.3);
    wardenArms.push(arm);
    wardenTorso.add(arm);
  }
  warden.add(wardenTorso);
  scene.add(warden);
  const shieldMaterial = new THREE.MeshBasicMaterial({ color: "#a6ffde", transparent: true, opacity: 0.2, wireframe: true });
  materials.push(shieldMaterial);
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.42, 1), shieldMaterial);
  shield.position.y = 1.05;
  rider.add(shield);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: "#102d33", transparent: true, opacity: 0.42, depthWrite: false });
  materials.push(shadowMaterial);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  shadow.scale.y = 1.5;
  scene.add(shadow);
  const wardenShadow = new THREE.Mesh(shadow.geometry, shadowMaterial);
  wardenShadow.rotation.x = -Math.PI / 2;
  wardenShadow.position.y = 0.035;
  wardenShadow.scale.set(0.65, 0.95, 1);
  scene.add(wardenShadow);
  const sparkGeometry = new THREE.OctahedronGeometry(0.1, 0);
  const sparks = new THREE.InstancedMesh(sparkGeometry, yellow, 42);
  sparks.frustumCulled = false;
  scene.add(sparks);
  const preview = [
    { kind: "block" as const, lane: -1, z: 0.52 }, { kind: "gantry" as const, lane: 1, z: 0.8 },
    { kind: "jetpack" as const, lane: 0, z: 0.47 },
    { kind: "barrier" as const, lane: 0, z: 0.73 },
    ...Array.from({ length: 7 }, (_, i) => ({ kind: "cell" as const, lane: i < 4 ? 0 : 1, z: 0.24 + i * 0.075 })),
  ];
  let portrait = false;
  let lastDistrict = -1;
  const skies = ["#8daeb8", "#bda39a", "#617f96"];
  const fogTarget = new THREE.Color();
  let lastElapsed = 0;
  let duckBlend = 0;
  let boardPitch = 0;
  let carve = 0;
  const boardTrick = createBoardTrick();
  const stance = [new THREE.Vector3(-0.23, 0.402, -0.30), new THREE.Vector3(0.23, 0.402, 0.30)];
  const stanceYaw = [0.20, -0.16];
  const groundPosition = new THREE.Vector3();
  const hipPivot = new THREE.Vector3(0, 0.9, 0);
  const rotatedHipPivot = new THREE.Vector3();
  const groundRotation = new THREE.Quaternion();
  const inverseGroundRotation = new THREE.Quaternion();
  const boardRotation = new THREE.Quaternion();
  const boardRidePosition = new THREE.Vector3();
  const deckPivot = new THREE.Vector3(0, 0.255, 0);
  const deckPivotOffset = new THREE.Vector3();
  const flipRotation = new THREE.Quaternion();
  const boardLongAxis = new THREE.Vector3(0, 0, 1);
  const footTarget = new THREE.Vector3();
  const footRotation = new THREE.Quaternion();
  const kneePole = new THREE.Vector3();
  const poseEuler = new THREE.Euler();
  const flightJoint = new THREE.Quaternion();
  const upAxis = new THREE.Vector3(0, 1, 0);
  let lastJump = 0;
  let lastFlight = 0;
  let landingAt = -10;

  return {
    resize(width, height) {
      portrait = width / height < 0.85;
      const cap = width * height > 650_000 ? 1.35 : 1.65;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      city.resize(camera.aspect);
      camera.fov = portrait ? 67 : 53;
      camera.updateProjectionMatrix();
    },
    draw(model, reducedMotion, idle) {
      if (model.elapsed < lastElapsed) {
        duckBlend = 0;
        boardPitch = 0;
        carve = 0;
        boardTrick.reset();
        landingAt = -10;
        lastJump = 0;
        lastFlight = 0;
      }
      const delta = Math.min(0.1, Math.max(0, model.elapsed - lastElapsed));
      lastElapsed = model.elapsed;
      if ((lastJump > 0 && model.jump === 0) || (lastFlight > 0 && model.flightHeight === 0)) landingAt = model.elapsed;
      lastJump = model.jump;
      lastFlight = model.flightHeight;
      const duckTarget = model.duckTimer > 0 ? 1 : 0;
      duckBlend = reducedMotion ? duckTarget : duckTarget
        ? Math.min(1, duckBlend + delta / 0.12)
        : Math.max(0, duckBlend - delta / 0.18);
      const landingAge = Math.min(1, Math.max(0, (model.elapsed - landingAt) / 0.28));
      const landingBend = reducedMotion ? 0 : Math.sin(landingAge * Math.PI) * 0.16;
      const travel = model.distance * 0.88;
      const district = Math.floor(model.distance / 250) % 3;
      if (district !== lastDistrict) {
        fogTarget.set(skies[district] ?? "#8daeb8");
        lastDistrict = district;
      }
      (scene.background as THREE.Color).lerp(fogTarget, reducedMotion ? 1 : 0.01);
      (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
      // Physics remains immediate; easing only shapes the visible lift and pose.
      const flightHeight = THREE.MathUtils.smoothstep(model.flightHeight, 0, 1);
      camera.position.set(reducedMotion ? 0 : model.laneVisual * 0.2 + flightHeight * (portrait ? 1.3 : 2.4), (portrait ? 6.5 : 5.2) + flightHeight * 0.6, portrait ? 11.8 : 10.7);
      camera.lookAt(reducedMotion ? 0 : model.laneVisual * 0.12, 1.2 + flightHeight * 0.6, -15);
      for (let i = 0; i < 84; i++) {
        dummy.position.set((i % 3 - 1) * LANE_WIDTH, -0.015, 9 - Math.floor(i / 3) * 4.3 + travel % 4.3);
        dummy.scale.set(1.75, 0.05, 0.18);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        ties.setMatrixAt(i, dummy.matrix);
      }
      ties.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 44; i++) {
        dummy.position.set(i % 2 ? 5.5 : -5.5, 0.3, 9 - Math.floor(i / 2) * 6 + travel % 6);
        dummy.scale.set(0.1, 0.075, 1.3);
        dummy.updateMatrix();
        trackLights.setMatrixAt(i, dummy.matrix);
      }
      trackLights.instanceMatrix.needsUpdate = true;
      arches.forEach((arch, i) => { arch.position.z = 14 - i * 23 + travel % 23; });
      city.update(model.distance, model.elapsed, reducedMotion);
      for (const kind of Object.keys(pools) as EntityKind[]) {
        used[kind] = 0;
        for (const item of pools[kind]) item.visible = false;
      }
      const entities = idle ? preview : model.entities;
      for (const item of entities) {
        if (("active" in item && !item.active) || item.z > 1.25 || item.z < -0.07) continue;
        const pickup = item.kind === "cell" || item.kind === "shield" || item.kind === "jetpack" || item.kind === "magnet";
        // Pickups end at the player, never grow through the chase camera.
        if (pickup && "checked" in item && item.checked) continue;
        const mesh = pools[item.kind][used[item.kind]++];
        if (!mesh) continue;
        mesh.visible = true;
        mesh.scale.setScalar(1);
        mesh.position.set(item.lane * LANE_WIDTH, 0, -(item.z - 0.13) * FAR_DISTANCE);
        if (item.kind === "cell" && "magnetPull" in item && item.magnetPull > 0) {
          const pull = THREE.MathUtils.smoothstep(item.magnetPull, 0, 1);
          const bend = Math.sin(pull * Math.PI);
          const laneDelta = (item.lane - model.laneVisual) * LANE_WIDTH;
          const collectionSide = laneDelta < 0 ? -0.65 : 0.65;
          mesh.position.x = THREE.MathUtils.lerp(item.lane * LANE_WIDTH, model.laneVisual * LANE_WIDTH + collectionSide, pull) + bend * laneDelta * 0.12;
          // Pull below the rider's shoulders; flight never lifts the ground rows.
          mesh.position.y = bend * 0.15 - pull * 0.25;
          mesh.scale.setScalar(1 - THREE.MathUtils.smoothstep(pull, 0.48, 1) * 0.94);
        }
        mesh.rotation.y = !reducedMotion && (item.kind === "cell" || item.kind === "shield" || item.kind === "jetpack" || item.kind === "magnet") ? model.elapsed * (item.kind === "jetpack" || item.kind === "magnet" ? 0.8 : 1.9) : 0;
      }
      rider.position.set(model.laneVisual * LANE_WIDTH, model.jump * 5 + flightHeight * 4.2, 0);
      rider.rotation.z = 0;
      const moving = !reducedMotion && !idle;
      const grounded = 1 - flightHeight;
      const trick = boardTrick.update(model.jump, model.jumpVelocity, model.flightHeight, model.flightTimer, model.elapsed, !moving);
      const footRelease = trick.release * grounded;
      // An airborne trick already tucks the knees. Deep ducking takes over
      // as the feet catch the board, without folding the body into the shoes.
      const crouch = THREE.MathUtils.smoothstep(duckBlend, 0, 1) * grounded * (1 - trick.release);
      const speedFeel = THREE.MathUtils.clamp((model.speed - 0.25) * 2.4, 0.2, 1);
      const carveTarget = moving ? THREE.MathUtils.clamp((model.lane - model.laneVisual) * 1.6, -1, 1) : 0;
      carve = moving ? THREE.MathUtils.damp(carve, carveTarget, 11, delta) : 0;
      // Small distance-linked suspension reads as riding the surface, rather
      // than an idle breathing loop. The deck and both shoes share contact.
      const suspension = moving ? Math.sin(model.distance * 0.23) * 0.025 * speedFeel * grounded : 0;
      const sway = moving ? Math.sin(model.distance * 0.105) * 0.027 * grounded : 0;
      const pitchTarget = model.jump > 0 ? -model.jumpVelocity * 0.075 : landingBend * 0.38 + suspension * 0.45;
      boardPitch = reducedMotion ? 0 : THREE.MathUtils.damp(boardPitch, pitchTarget, 15, delta);
      board.position.set(0, moving ? suspension * 0.38 - landingBend * 0.16 : 0, 0);
      board.rotation.set(boardPitch * grounded, carve * 0.16 * grounded, -carve * 0.24 * grounded);
      boardRotation.copy(board.quaternion);
      boardRidePosition.copy(board.position);
      // Flip around the deck's centre, leaving the rider upright. The stored
      // ride transform gives the shoes a stable target to catch afterwards.
      flipRotation.setFromAxisAngle(boardLongAxis, trick.rotation);
      board.quaternion.multiply(flipRotation);
      deckPivotOffset.copy(deckPivot).applyQuaternion(flipRotation).sub(deckPivot).negate().applyQuaternion(boardRotation);
      board.position.add(deckPivotOffset);
      board.position.y -= footRelease * 0.12;
      board.scale.set(1 - flightHeight * 0.96, 1 - flightHeight * 0.8, 1 - flightHeight * 0.96);

      // Solve the planted stance in its own coordinate system before blending
      // to flight. This keeps ankles on the moving deck during carve and duck.
      groundPosition.set(carve * 0.075 + sway, -0.025 - crouch * 0.31 - landingBend * 0.56 + suspension + footRelease * 0.12, crouch * 0.18);
      poseEuler.set(-0.11 - crouch * 0.86 - speedFeel * 0.025 - footRelease * 0.08, 0.28 + carve * 0.19, -carve * 0.11 - sway * 0.3);
      groundRotation.setFromEuler(poseEuler);
      // Lean around the pelvis instead of the board origin, so crouching
      // does not pull the rear hip beyond the planted leg's natural reach.
      rotatedHipPivot.copy(hipPivot).applyQuaternion(groundRotation);
      groundPosition.add(hipPivot).sub(rotatedHipPivot);
      inverseGroundRotation.copy(groundRotation).invert();
      for (let index = 0; index < legSolvers.length; index++) {
        footTarget.copy(stance[index]!);
        footTarget.y += footRelease * 0.46;
        footTarget.x += (index ? 1 : -1) * footRelease * 0.06;
        footTarget.applyQuaternion(boardRotation).add(boardRidePosition).sub(groundPosition).applyQuaternion(inverseGroundRotation);
        footRotation.setFromAxisAngle(upAxis, stanceYaw[index]!);
        footRotation.premultiply(boardRotation).premultiply(inverseGroundRotation);
        // Keep bent knees above the board when the chest folds forward.
        // A little outward direction keeps the bend continuous as it deepens.
        kneePole.set((index ? 1 : -1) * (0.22 + crouch * 0.28), 0.35 + crouch * 1.15, -1 + crouch * 0.8);
        kneePole.applyQuaternion(boardRotation).applyQuaternion(inverseGroundRotation);
        legSolvers[index]!.solve(footTarget, footRotation, kneePole);
        poseEuler.set(index ? 0.025 : -0.025, 0, index ? 0.035 : -0.035);
        flightJoint.setFromEuler(poseEuler);
        riderHips[index]!.quaternion.slerp(flightJoint, flightHeight);
        poseEuler.set(0.11, 0, 0);
        flightJoint.setFromEuler(poseEuler);
        riderKnees[index]!.quaternion.slerp(flightJoint, flightHeight);
        flightJoint.identity();
        riderFeet[index]!.quaternion.slerp(flightJoint, flightHeight);
      }
      body.position.copy(groundPosition).multiplyScalar(grounded);
      body.position.y += flightHeight * 0.35;
      body.quaternion.copy(groundRotation);
      poseEuler.set(-1.44, 0, 0);
      flightJoint.setFromEuler(poseEuler);
      body.quaternion.slerp(flightJoint, flightHeight);
      riderHead.position.set(0, 1.85 - crouch * 0.08, -0.02 - crouch * 0.08);
      riderHead.rotation.set(flightHeight * 1.22 + crouch * 0.38 - footRelease * 0.15, -0.20 * grounded - carve * 0.1, carve * 0.07 * grounded);
      riderArms.forEach((arm, index) => {
        const side = index ? 1 : -1;
        arm.rotation.x = (0.20 + side * 0.18 * (1 - crouch) + crouch * 1.9 + side * carve * 0.32 * (1 - crouch * 0.8)) * grounded + flightHeight * Math.PI;
        arm.rotation.y = -side * 0.1 * grounded;
        arm.rotation.z = side * (0.30 - crouch * 0.23 + Math.abs(carve) * 0.22 + landingBend * 0.5 + footRelease * 0.38) * grounded + side * flightHeight * 0.1;
        if (moving) arm.rotation.z += Math.sin(model.distance * 0.105 + index * Math.PI) * 0.025 * grounded * (1 - crouch);
      });
      riderElbows.forEach((elbow, index) => { elbow.rotation.x = (-0.48 + crouch * 1.68 - (index ? carve : -carve) * 0.16 * (1 - crouch)) * grounded; });
      rocket.pack.visible = flightHeight > 0.01 || model.flightTimer > 0;
      equippedMagnet.visible = model.magnetTimer > 0;
      rocket.flames.scale.y = (0.35 + flightHeight * 0.65) * (reducedMotion ? 1 : 0.93 + Math.sin(model.elapsed * 27) * 0.07);
      const chaseGap = model.hull <= 0 ? 1.8 : model.hull === 1 ? 3.2 : Math.min(8.3, 2.5 + Math.max(0, model.elapsed - 1.5) * 0.65);
      warden.position.set(model.laneVisual * LANE_WIDTH - (portrait ? 0.9 : 1.25), 0, chaseGap + flightHeight * 0.4);
      warden.visible = chaseGap < 8 || model.hull < 2;
      const stride = idle || reducedMotion ? 0.25 : Math.sin(model.elapsed * 14);
      wardenLegs.forEach((leg, index) => { leg.rotation.x = stride * (index ? 0.8 : -0.8); });
      wardenArms.forEach((arm, index) => { arm.rotation.x = stride * (index ? -0.95 : 0.95) - 0.25; });
      wardenTorso.rotation.x = -0.12;
      wardenTorso.position.y = idle || reducedMotion ? 0 : Math.abs(stride) * 0.045;
      wardenShadow.visible = warden.visible;
      wardenShadow.position.x = warden.position.x;
      wardenShadow.position.z = warden.position.z;
      shield.visible = model.shield > 0 || model.burstTimer > 0 || model.invulnerabilityTimer > 0;
      shieldMaterial.color.set(model.burstTimer > 0 ? "#ffd37e" : model.invulnerabilityTimer > 0 ? "#eb7a45" : "#a6ffde");
      shield.scale.setScalar(model.burstTimer > 0 ? 1.16 : 1);
      shield.rotation.y = reducedMotion ? 0 : model.elapsed * 0.7;
      shadow.position.x = rider.position.x;
      shadow.scale.setScalar(1 - Math.min(0.5, model.jump * 0.3 + flightHeight * 0.4));
      let sparkCount = 0;
      if (!reducedMotion) {
        for (const particle of model.particles) {
          if (!particle.active) continue;
          dummy.position.set((particle.x - 0.5) * 17, 0.4 + (0.78 - particle.y) * 14, 0.8 + particle.life * 2);
          dummy.scale.setScalar(Math.max(0, particle.life * 2));
          dummy.rotation.set(particle.life * 3, particle.life * 5, 0);
          dummy.updateMatrix();
          sparks.setMatrixAt(sparkCount++, dummy.matrix);
        }
      }
      sparks.count = sparkCount;
      sparks.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    },
    dispose() {
      city.dispose();
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          if (object instanceof THREE.InstancedMesh) object.dispose();
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const mat of materials) mat.dispose();
      renderer.dispose();

    },
  };
}
