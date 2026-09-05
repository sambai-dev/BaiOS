// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from "three";
import type { MissionId, Vector3 } from "./vector-lab-math";

export type VectorView = { yaw: number; pitch: number };
export type VectorSceneState = {
  a: Vector3; b: Vector3; output: Vector3; target: Vector3;
  mission: MissionId; view: VectorView; success: boolean;
};
type ScreenPoint = { x: number; y: number; visible: boolean };
type SceneOptions = {
  onProject: (a: ScreenPoint, b: ScreenPoint) => void;
  onFinish: () => void;
};

/** An on-demand renderer. Only a user-triggered experiment requests animation frames. */
export function createVectorScene(canvas: HTMLCanvasElement, options: SceneOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 600 ? 1.5 : 2));
  renderer.setClearColor(0x101b21);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x101b21, 12, 29);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
  const target = new THREE.Vector3(0, 0.35, 0);
  scene.add(new THREE.HemisphereLight(0xc7efff, 0x23322b, 2.4));
  const light = new THREE.DirectionalLight(0xffffff, 3.2);
  light.position.set(-3, 8, 4);
  scene.add(light);
  const fill = new THREE.DirectionalLight(0x54e7b0, 1.2);
  fill.position.set(4, 1, -4);
  scene.add(fill);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.9, 0.18, 80), new THREE.MeshStandardMaterial({ color: 0x172b32, roughness: 0.88, metalness: 0.2, transparent: true, opacity: 0.7, depthWrite: false }));
  base.position.y = -0.2;
  scene.add(base);
  const grid = new THREE.GridHelper(8, 16, 0x47717a, 0x29434a);
  grid.position.y = -0.102;
  scene.add(grid);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.65, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: 0x5c7b7f }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.08;
  scene.add(rim);

  const makeArrow = (color: number, radius: number) => {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), material);
    const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.3, 0.27, 16), material);
    group.add(shaft, head);
    scene.add(group);
    return { group, shaft, head };
  };
  const arrowA = makeArrow(0x60e6ba, 0.035);
  const arrowB = makeArrow(0xf3b96d, 0.035);
  const arrowOutput = makeArrow(0xe3f1f2, 0.018);
  const origin = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), new THREE.MeshStandardMaterial({ color: 0xe3f1f2, metalness: 0.7, roughness: 0.3 }));
  scene.add(origin);
  const payload = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0xf2f7f5, roughness: 0.22, metalness: 0.55 }));
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 6, 24), new THREE.MeshStandardMaterial({ color: 0x60e6ba, emissive: 0x123526, roughness: 0.4 }));
  belt.rotation.x = Math.PI / 2;
  payload.add(body, belt);
  scene.add(payload);
  const beacon = new THREE.Group();
  const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0x70e7bd, transparent: true, opacity: 0.7 });
  [0.28, 0.4].forEach((radius) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 6, 48), beaconMaterial);
    beacon.add(ring);
  });
  const crosshairGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0),
    new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 0.5, 0),
  ]);
  beacon.add(new THREE.LineSegments(crosshairGeometry, new THREE.LineBasicMaterial({ color: 0x70e7bd, transparent: true, opacity: 0.5 })));
  scene.add(beacon);

  const surfaceGeometry = new THREE.BufferGeometry();
  surfaceGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(18), 3));
  const surface = new THREE.Mesh(surfaceGeometry, new THREE.MeshBasicMaterial({ color: 0x5bacbd, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  scene.add(surface);
  const ghostGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const ghost = new THREE.Line(ghostGeometry, new THREE.LineDashedMaterial({ color: 0x8eadae, dashSize: 0.08, gapSize: 0.065, transparent: true, opacity: 0.6 }));
  scene.add(ghost);
  const labels: THREE.Sprite[] = [];
  const addLabel = (text: string, position: Vector3) => {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 64;
    textureCanvas.height = 64;
    const context = textureCanvas.getContext("2d")!;
    context.fillStyle = "#97b7bd";
    context.font = "500 32px monospace";
    context.textAlign = "center";
    context.fillText(text, 32, 43);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(textureCanvas), transparent: true, depthTest: false }));
    sprite.scale.setScalar(0.34);
    sprite.position.set(...position);
    scene.add(sprite);
    labels.push(sprite);
  };
  addLabel("X", [3.6, 0, 0]); addLabel("Y", [0, 3.5, 0]); addLabel("Z", [0, 0, 3.6]);
  const axisMaterial = new THREE.LineBasicMaterial({ color: 0x47656d, transparent: true, opacity: 0.7 });
  const axisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3(3.4, 0, 0),
    new THREE.Vector3(), new THREE.Vector3(0, 3.3, 0),
    new THREE.Vector3(), new THREE.Vector3(0, 0, 3.4),
  ]);
  scene.add(new THREE.LineSegments(axisGeometry, axisMaterial));

  let state: VectorSceneState | null = null;
  let width = 1, height = 1, frame = 0, disposed = false, active = true, intersecting = true;
  let flight: { progress: number; last: number; output: THREE.Vector3 } | null = null;
  const up = new THREE.Vector3(0, 1, 0);
  const raycaster = new THREE.Raycaster();
  const vector = new THREE.Vector3();
  const project = (point: Vector3): ScreenPoint => {
    vector.set(...point).project(camera);
    return { x: (vector.x + 1) * width / 2, y: (1 - vector.y) * height / 2, visible: vector.z < 1 && Math.abs(vector.x) < 0.98 && Math.abs(vector.y) < 0.95 };
  };
  const canRender = () => active && intersecting && !document.hidden && !disposed;
  const render = (now: number) => {
    frame = 0;
    if (!canRender() || !state) return;
    if (flight) {
      flight.progress += (now - flight.last) / 1100;
      flight.last = now;
      const t = Math.min(1, flight.progress);
      payload.position.copy(flight.output).multiplyScalar(t * t * (3 - 2 * t));
      body.rotation.y = t * Math.PI * 2;
      if (t >= 1) { flight = null; options.onFinish(); }
    }
    beacon.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
    options.onProject(project(state.a), project(state.b));
    if (flight) frame = requestAnimationFrame(render);
  };
  const invalidate = () => { if (!frame && canRender()) frame = requestAnimationFrame(render); };
  const pause = () => { if (frame) cancelAnimationFrame(frame); frame = 0; if (flight) flight.last = performance.now(); };
  const visibility = () => { pause(); invalidate(); };
  document.addEventListener("visibilitychange", visibility);
  const intersection = new IntersectionObserver((entries) => { intersecting = !!entries[0]?.isIntersecting; visibility(); });
  intersection.observe(canvas);
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (state) update(state);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const setArrow = (arrow: ReturnType<typeof makeArrow>, value: Vector3) => {
    const direction = new THREE.Vector3(...value);
    const length = direction.length();
    arrow.group.visible = length > 0.025;
    if (!arrow.group.visible) return;
    const headLength = Math.min(0.27, length * 0.4);
    arrow.group.quaternion.setFromUnitVectors(up, direction.normalize());
    arrow.shaft.scale.y = Math.max(0.001, length - headLength);
    arrow.shaft.position.y = (length - headLength) / 2;
    arrow.head.scale.y = headLength / 0.27;
    arrow.head.position.y = length - headLength / 2;
  };
  function update(next: VectorSceneState) {
    const changed = !state || next.a !== state.a || next.b !== state.b || next.output !== state.output || next.mission !== state.mission;
    state = next;
    const extent = Math.max(Math.hypot(...next.a), Math.hypot(...next.b), Math.hypot(...next.output), Math.hypot(...next.target));
    const distance = Math.max(11.8, extent * 3.15) * (camera.aspect < 1 ? 1.27 : 1);
    if (scene.fog instanceof THREE.Fog) { scene.fog.near = distance * 1.1; scene.fog.far = distance * 2.5; }
    camera.position.set(Math.sin(next.view.yaw) * Math.cos(next.view.pitch) * distance, Math.sin(next.view.pitch) * distance, Math.cos(next.view.yaw) * Math.cos(next.view.pitch) * distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    setArrow(arrowA, next.a); setArrow(arrowB, next.b); setArrow(arrowOutput, next.output);
    beacon.visible = next.mission !== "explore";
    beacon.position.set(...next.target);
    beaconMaterial.color.setHex(next.success ? 0x70e7bd : 0xd4e4e4);
    const a = new THREE.Vector3(...next.a), b = new THREE.Vector3(...next.b), sum = a.clone().add(b);
    const positions = surfaceGeometry.getAttribute("position") as THREE.BufferAttribute;
    const points = [new THREE.Vector3(), a, sum, new THREE.Vector3(), sum, b];
    points.forEach((point, index) => positions.setXYZ(index, point.x, point.y, point.z));
    positions.needsUpdate = true;
    surfaceGeometry.computeBoundingSphere();
    surface.visible = next.mission === "lift" || next.mission === "explore";
    const linePositions = ghostGeometry.getAttribute("position") as THREE.BufferAttribute;
    linePositions.setXYZ(0, ...next.a);
    linePositions.setXYZ(1, ...next.output);
    linePositions.needsUpdate = true;
    ghostGeometry.computeBoundingSphere(); ghost.computeLineDistances();
    if (changed) { flight = null; payload.position.set(0, 0, 0); }
    invalidate();
  }
  resize();
  return {
    update,
    setActive(value: boolean) { active = value; visibility(); },
    drag(clientX: number, clientY: number, plane: "xy" | "xz", current: Vector3): Vector3 | null {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / width * 2 - 1, -(clientY - rect.top) / height * 2 + 1), camera);
      const dragPlane = plane === "xy" ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -current[2]) : new THREE.Plane(new THREE.Vector3(0, 1, 0), -current[1]);
      const hit = raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
      return hit ? [hit.x, hit.y, hit.z].map((value) => Math.max(-3, Math.min(3, Math.round(value * 10) / 10))) as Vector3 : null;
    },
    launch(reducedMotion: boolean) {
      if (!state) return;
      if (reducedMotion) { payload.position.set(...state.output); invalidate(); options.onFinish(); return; }
      flight = { progress: 0, last: performance.now(), output: new THREE.Vector3(...state.output) };
      invalidate();
    },
    dispose() {
      disposed = true; pause(); observer.disconnect(); intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          if ("geometry" in object) geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => { if ("map" in material && material.map instanceof THREE.Texture) material.map.dispose(); material.dispose(); });
      // Releasing GPU resources is sufficient; forceContextLoss would poison
      // the same canvas when React Strict Mode immediately remounts the effect.
      renderer.dispose();
    },
  };
}

export type VectorScene = ReturnType<typeof createVectorScene>;
