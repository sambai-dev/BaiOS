// SPDX-License-Identifier: AGPL-3.0-or-later
// Original procedural landmarks. No downloaded models, textures or park branding.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { getRailshiftDistrict, RAILSHIFT_ROUTE_LENGTH as ROUTE_LENGTH } from "./railshift-route";
export { getRailshiftDistrict } from "./railshift-route";

export type RailshiftCity = {
  group: THREE.Group;
  resize: (aspect: number) => void;
  update: (distance: number, elapsed: number, reducedMotion: boolean) => void;
  dispose: () => void;
};

const TAU = Math.PI * 2;
const positiveMod = (value: number, range: number) => ((value % range) + range) % range;
const smoothstep = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
};
const districtWeight = (route: number, start: number, end: number) =>
  smoothstep((route - start) / 38) * smoothstep((end - route) / 38);

/** Retained, batched scenery: the runner owns the only animation loop. */
export function createRailshiftCity(): RailshiftCity {
  const group = new THREE.Group();
  group.name = "Railshift metropolitan districts";
  const geometries = new Set<THREE.BufferGeometry>();
  const materials: THREE.Material[] = [];
  const instances: THREE.InstancedMesh[] = [];
  const keep = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const material = (color: string, options: THREE.MeshStandardMaterialParameters = {}) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.12, flatShading: true, ...options });
    materials.push(result);
    return result;
  };
  const ivory = material("#f0dfbe");
  const stone = material("#9bb4b5");
  const teal = material("#235660");
  const copper = material("#eb895a");
  const blue = material("#527699");
  const glass = material("#417a88", { metalness: 0.48, roughness: 0.3 });
  const mint = material("#b1f0d1", { emissive: "#254b40" });
  const honey = material("#ffcd76", { emissive: "#342510" });
  const water = material("#528c9b", { metalness: 0.32, roughness: 0.45 });
  const foliage = material("#4c817b");
  const box = keep(new THREE.BoxGeometry(1, 1, 1));
  const sphere = keep(new THREE.SphereGeometry(1, 16, 10));
  const cone = keep(new THREE.ConeGeometry(1, 1, 12));
  const cylinder = keep(new THREE.CylinderGeometry(1, 1, 1, 12));
  const ring = keep(new THREE.TorusGeometry(1, 0.025, 6, 64));
  const dummy = new THREE.Object3D();

  // Bake static pieces by material. Landmarks remain detailed without one draw per beam.
  const batch = (parent: THREE.Group) => {
    const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
    return {
      add(geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, w = 1, h = 1, d = 1, rx = 0, ry = 0, rz = 0) {
        dummy.position.set(x, y, z);
        dummy.scale.set(w, h, d);
        dummy.rotation.set(rx, ry, rz);
        dummy.updateMatrix();
        const piece = geometry.clone().applyMatrix4(dummy.matrix);
        const list = parts.get(mat);
        if (list) list.push(piece);
        else parts.set(mat, [piece]);
      },
      finish() {
        for (const [mat, pieces] of parts) {
          // All primitives use position, normal and UV attributes with indexed faces.
          const geometry = mergeGeometries(pieces, false);
          for (const piece of pieces) piece.dispose();
          if (geometry) parent.add(new THREE.Mesh(keep(geometry), mat));
        }
        parts.clear();
      },
    };
  };

  const waterfront = batch(group);
  waterfront.add(box, water, 0, -6.25, -55, 280, 0.25, 260);
  // A promenade and stepped seawall leave an open bay beside the elevated railway.
  waterfront.add(box, stone, -24, -5.4, -62, 27, 1.7, 120);
  waterfront.add(box, ivory, -10.8, -4.35, -62, 0.5, 0.45, 120);
  waterfront.add(box, teal, -10.75, -5.1, -62, 0.65, 0.6, 120);
  waterfront.add(box, stone, 34, -5.3, -79, 28, 1.8, 90);
  waterfront.add(box, ivory, 20.3, -4.25, -79, 0.5, 0.4, 90);
  for (let i = 0; i < 18; i++) {
    const z = -10 - i * 7;
    waterfront.add(box, teal, -11.5, -2.9, z, 0.11, 3.1, 0.11);
    waterfront.add(sphere, honey, -11.5, -1.35, z, 0.23, 0.28, 0.23);
    if (i % 2 === 0) {
      waterfront.add(cylinder, copper, -17.5, -3.5, z, 0.2, 2, 0.2);
      waterfront.add(sphere, foliage, -17.5, -1.6, z, 1.6, 2.0, 1.6);
    }
  }
  // Long reflections, quiet enough to leave pickups and obstacles visually dominant.
  for (let i = 0; i < 22; i++) {
    waterfront.add(box, stone, 11 + (i * 17) % 60, -6.08, -15 - (i * 19) % 110, 2 + i % 5, 0.012, 0.09);
  }
  waterfront.finish();

  // Downtown decks cover the bay until the route reaches the waterfront. The
  // three batched surfaces dissolve together during the short district approach.
  const urbanDeck = new THREE.Group();
  urbanDeck.name = "Downtown streets";
  const roadMaterial = material("#55747e", { transparent: true });
  const sidewalkMaterial = material("#acb7b5", { transparent: true });
  const roadMarkMaterial = material("#d8d5bb", { transparent: true });
  const streets = batch(urbanDeck);
  for (const side of [-1, 1]) {
    streets.add(box, sidewalkMaterial, side * 35, -5.1, -63, 49, 1.75, 152);
    streets.add(box, roadMaterial, side * 18.8, -4.2, -63, 7.7, 0.05, 152);
    for (let i = 0; i < 26; i++) streets.add(box, roadMarkMaterial, side * 18.8, -4.16, 8 - i * 6, 0.12, 0.03, 2.8);
  }
  streets.finish();
  group.add(urbanDeck);

  const buildingCount = 78;
  const buildings = new THREE.InstancedMesh(box, ivory, buildingCount);
  const windows = new THREE.InstancedMesh(box, glass, buildingCount * 6);
  const crowns = new THREE.InstancedMesh(box, teal, buildingCount);
  buildings.name = "Metropolitan tower blocks";
  buildings.frustumCulled = windows.frustumCulled = crowns.frustumCulled = false;
  instances.push(buildings, windows, crowns);
  group.add(buildings, windows, crowns);
  const palettes = [
    ["#8daab7", "#7297ab", "#b6c2c4", "#60849c"],
    ["#c7c6b4", "#90afb3", "#d5b594", "#6b929f"],
    ["#d0b18f", "#91aead", "#e0caa9", "#809aaf"],
  ].map((palette) => palette.map((color) => new THREE.Color(color)));
  const buildingData = Array.from({ length: buildingCount }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const x = side * (15 + (i * 17) % 49);
    const height = 13 + (i * 13) % 28 + (i % 7 === 0 ? 9 : 0);
    return { x, z: -(49 + (i * 23) % 89), width: 3.6 + i % 5, depth: 4 + i % 4, height };
  });

  const skyline = new THREE.Group();
  skyline.name = "Downtown signature skyline";
  const towers = batch(skyline);
  // A family of original metropolitan silhouettes: terraces, glass fins, a
  // twisting crown and an observation mast. These are geometry, not city assets.
  for (const side of [-1, 1]) {
    const x = side * 19;
    const z = side < 0 ? -86 : -76;
    towers.add(box, stone, x, 9, z, 8.5, 30, 8);
    towers.add(box, glass, x, 10, z + 4.05, 7.1, 27, 0.1);
    for (let row = 0; row < 10; row++) towers.add(box, ivory, x, -2 + row * 2.7, z + 4.13, 7.7, 0.13, 0.12);
    towers.add(box, ivory, x, 26, z, 6.4, 5.2, 6);
    towers.add(box, copper, x, 29.0, z, 4.4, 1.0, 4.4);
    towers.add(cone, mint, x, 31.7, z, 1.4, 4.3, 1.4);
  }
  towers.add(box, blue, 32, 13, -92, 9, 38, 9);
  towers.add(box, glass, 32, 14, -87.45, 7.8, 34, 0.1);
  towers.add(box, ivory, 28.3, 15.5, -87.3, 0.24, 41, 0.3);
  towers.add(box, ivory, 35.7, 15.5, -87.3, 0.24, 41, 0.3);
  towers.add(box, copper, 32, 35.2, -92, 9.4, 0.65, 9.4);
  towers.add(cylinder, ivory, 32, 39.4, -92, 0.13, 8, 0.13);
  towers.add(sphere, honey, 32, 43.5, -92, 0.45, 0.45, 0.45);
  for (const side of [-1, 1]) {
    const x = side < 0 ? -33 : 15.5;
    const z = side < 0 ? -67 : -56;
    for (let tier = 0; tier < 6; tier++) {
      const width = 8.2 - tier * 0.76;
      towers.add(box, tier % 2 ? blue : stone, x, -3.8 + tier * 4.2, z, width, 4.2, width * 0.8);
      towers.add(box, glass, x, -3.8 + tier * 4.2, z + width * 0.4 + 0.025, width - 0.45, 3.4, 0.06);
      towers.add(box, ivory, x, -1.68 + tier * 4.2, z, width + 0.12, 0.16, width * 0.8 + 0.12);
    }
  }
  // The rising twist remains a single material batch despite its layered shape.
  for (let tier = 0; tier < 10; tier++) {
    const width = 8.1 - tier * 0.43;
    towers.add(box, glass, 25.5, -3.9 + tier * 3.7, -87, width, 3.8, width * 0.79, 0, tier * 0.1);
    towers.add(box, ivory, 25.5, -1.96 + tier * 3.7, -87, width + 0.08, 0.12, width * 0.79 + 0.08, 0, tier * 0.1);
  }
  towers.add(cone, blue, 25.5, 34.8, -87, 2.1, 3.2, 2.1);
  const observatory = new THREE.Group();
  observatory.name = "Meridian observation tower";
  const observatoryBatch = batch(observatory);
  // Two observation decks and three splayed legs give the mast a legible outline.
  observatoryBatch.add(cylinder, stone, -24, 8.5, -86, 0.55, 29, 0.55);
  for (const offset of [-1, 1]) {
    observatoryBatch.add(box, ivory, -24 + offset * 1.65, 1.0, -86, 0.32, 15.3, 0.4, 0, 0, offset * 0.22);
  }
  observatoryBatch.add(sphere, blue, -24, 9.0, -86, 3.3, 2.6, 3.3);
  observatoryBatch.add(ring, ivory, -24, 9.1, -86, 3.36, 3.36, 3.36, Math.PI / 2);
  observatoryBatch.add(sphere, blue, -24, 22, -86, 2.1, 1.7, 2.1);
  observatoryBatch.add(ring, mint, -24, 22, -86, 2.18, 2.18, 2.18, Math.PI / 2);
  observatoryBatch.add(cone, ivory, -24, 28, -86, 0.28, 9, 0.28);
  observatoryBatch.finish();
  skyline.add(observatory);
  // A harbour bridge glimpsed beyond the towers; never across the playable track.
  towers.add(box, ivory, 42, -0.5, -79, 29, 0.9, 3.0);
  for (const x of [31, 51]) {
    towers.add(box, copper, x, 4.5, -79, 0.65, 18, 0.65);
    for (let j = 0; j < 4; j++) towers.add(box, ivory, x + (j - 1.5) * 2, 3 + j % 2, -77.6, 0.1, 7 + j % 2 * 2, 0.1);
  }
  towers.finish();
  group.add(skyline);

  // Three continuous ridgelines replace isolated cone peaks. Irregular summits,
  // branching shoulders and hazy foothills create depth with only three draws.
  const mountains = new THREE.Group();
  mountains.name = "Layered coastal mountain range";
  const mountainMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false });
  materials.push(mountainMaterial);
  const haze = new THREE.Color("#9ab4bd");
  const ridgeColor = new THREE.Color();
  const facetColor = new THREE.Color();
  const terrainLayers = [
    { z: -183, seed: 2.3, height: 1.08, color: "#9aafb9", shift: -17 },
    { z: -164, seed: 5.8, height: 0.79, color: "#7799aa", shift: 14 },
    { z: -142, seed: 8.1, height: 0.48, color: "#5c8399", shift: -4 },
  ];
  const peak = (x: number, center: number, width: number, height: number) => height * Math.exp(-Math.pow((x - center) / width, 2));
  for (const layer of terrainLayers) {
    const segments = 112;
    const columns = segments + 1;
    const vertices: number[] = [];
    const positions: number[] = [];
    const colors: number[] = [];
    const heights: number[] = [];
    ridgeColor.set(layer.color);
    for (let column = 0; column <= segments; column++) {
      const x = -154 + column / segments * 308;
      const shifted = x + layer.shift;
      const massifs = peak(shifted, -111, 28, 23) + peak(shifted, -67, 20, 14)
        + peak(shifted, -14, 25, 25) + peak(shifted, -22, 7, 7) + peak(shifted, -7, 5, 4)
        + peak(shifted, 42, 25, 19) + peak(shifted, 98, 29, 27);
      const detail = Math.sin(x * 0.24 + layer.seed) * 1.75 + Math.sin(x * 0.47 + layer.seed * 2) * 0.8;
      heights.push(Math.max(2, (massifs + detail) * layer.height));
    }
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column <= segments; column++) {
        const x = -154 + column / segments * 308;
        const height = heights[column]!;
        const shoulder = row === 0 ? 1 : row === 1 ? 0.56 : row === 2 ? 0.17 : 0;
        const gully = row === 1 ? Math.sin(x * 0.12 + layer.seed) * 1.6 : 0;
        vertices.push(x, -8 + Math.max(0, height * shoulder + gully), layer.z + row * 7 + Math.sin(x * 0.045 + layer.seed) * 1.8);
      }
    }
    const face = (a: number, b: number, c: number) => {
      const ax = vertices[a * 3]!, ay = vertices[a * 3 + 1]!, az = vertices[a * 3 + 2]!;
      const bx = vertices[b * 3]!, by = vertices[b * 3 + 1]!, bz = vertices[b * 3 + 2]!;
      const cx = vertices[c * 3]!, cy = vertices[c * 3 + 1]!, cz = vertices[c * 3 + 2]!;
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const normalLength = Math.hypot(nx, ny, nz) || 1;
      const light = (-nx * 0.55 + ny * 0.72 + nz * 0.43) / normalLength;
      const elevation = Math.max(0, Math.min(1, ((ay + by + cy) / 3 + 8) / 24));
      facetColor.copy(haze).lerp(ridgeColor, 0.22 + elevation * 0.78).multiplyScalar(0.98 + light * 0.045);
      positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      for (let i = 0; i < 3; i++) colors.push(facetColor.r, facetColor.g, facetColor.b);
    };
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < segments; column++) {
        const a = row * columns + column;
        face(a, a + columns, a + 1);
        face(a + 1, a + columns, a + columns + 1);
      }
    }
    const terrain = keep(new THREE.BufferGeometry());
    terrain.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    terrain.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    terrain.computeVertexNormals();
    const mountain = new THREE.Mesh(terrain, mountainMaterial);
    mountain.name = `Coastal ridge ${mountains.children.length + 1}`;
    mountains.add(mountain);
  }
  group.add(mountains);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: "#ffe3b7", fog: false });
  materials.push(sunMaterial);
  const sun = new THREE.Mesh(sphere, sunMaterial);
  sun.scale.setScalar(7.3);
  sun.position.set(-40, 33, -155);
  group.add(sun);

  const park = new THREE.Group();
  park.name = "Lantern Pier amusement park";
  park.position.set(-25, -4.6, -38);
  park.rotation.y = 0.17;
  const parkStatic = batch(park);
  parkStatic.add(box, stone, 0, -0.4, 0, 24, 0.8, 16);
  parkStatic.add(box, ivory, 0, 0.08, 6.4, 24, 0.3, 0.5);
  for (const side of [-1, 1]) {
    parkStatic.add(box, ivory, side * 2.8, 4.8, 0, 0.65, 11, 0.65, 0, 0, side * 0.43);
    parkStatic.add(box, teal, side * 4.8, 0.4, 0, 2.4, 0.75, 3.2);
  }
  parkStatic.add(cylinder, copper, 0, 10.2, 0, 0.7, 2.4, 0.7, Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const x = -9 + i * 4.8;
    parkStatic.add(cylinder, ivory, x, 1.35, 6, 1.55, 2.7, 1.55);
    parkStatic.add(cone, i % 2 ? blue : copper, x, 3.45, 6, 2.2, 2.2, 2.2);
    parkStatic.add(sphere, honey, x, 4.6, 6, 0.22, 0.3, 0.22);
  }
  const coasterPoints = [new THREE.Vector3(-12, 2, -5), new THREE.Vector3(-8, 7, -7), new THREE.Vector3(-1, 3, -9), new THREE.Vector3(7, 9, -9), new THREE.Vector3(11, 2, -5)];
  const coaster = keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coasterPoints), 52, 0.16, 5, false));
  parkStatic.add(coaster, copper, 0, 0, 0);
  parkStatic.add(coaster, ivory, 0, 0, -0.8);
  for (let i = 0; i < 5; i++) {
    const point = coasterPoints[i]!;
    parkStatic.add(box, teal, point.x, point.y / 2, point.z - 0.4, 0.23, point.y, 0.23);
  }
  parkStatic.finish();

  const wheel = new THREE.Group();
  wheel.position.y = 10.2;
  const rotatingWheel = new THREE.Group();
  const wheelBatch = batch(rotatingWheel);
  for (const z of [-0.55, 0.55]) {
    wheelBatch.add(ring, ivory, 0, 0, z, 8.5, 8.5, 8.5);
    wheelBatch.add(ring, copper, 0, 0, z, 8.13, 8.13, 8.13);
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * TAU;
      wheelBatch.add(box, ivory, Math.cos(angle) * 4.2, Math.sin(angle) * 4.2, z, 8.4, 0.1, 0.12, 0, 0, angle);
      wheelBatch.add(sphere, honey, Math.cos(angle) * 8.5, Math.sin(angle) * 8.5, z, 0.25, 0.25, 0.25);
    }
  }
  wheelBatch.add(sphere, copper, 0, 0, 0, 0.85, 0.85, 0.85);
  wheelBatch.finish();
  wheel.add(rotatingWheel);
  park.add(wheel);
  const cabins = new THREE.InstancedMesh(box, copper, 12);
  const cabinWindows = new THREE.InstancedMesh(box, glass, 12);
  const cabinRoofs = new THREE.InstancedMesh(box, ivory, 12);
  const cabinHangers = new THREE.InstancedMesh(box, ivory, 12);
  for (const mesh of [cabins, cabinWindows, cabinRoofs, cabinHangers]) {
    mesh.frustumCulled = false;
    instances.push(mesh);
    wheel.add(mesh);
  }
  group.add(park);

  // The whale is modelled along X so its flukes, jaw and long flippers form a
  // readable side silhouette from the runner camera, including on a narrow screen.
  const whale = new THREE.Group();
  whale.name = "Harbour whale";
  const whaleSkin = material("#2b6178", { roughness: 0.48 });
  const whaleBelly = material("#c8dcd3");
  const whaleEye = material("#0b2637");
  const whaleBatch = batch(whale);
  const profile = [[0, -6], [0.32, -5.1], [0.55, -4], [1.1, -2.7], [1.7, -0.6], [1.8, 1.2], [1.52, 3], [1.05, 4.7], [0.73, 5.25], [0.2, 5.7], [0, 5.75]];
  const whaleBody = keep(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r!, y!)), 20));
  whaleBatch.add(whaleBody, whaleSkin, 0, 0, 0, 1, 1, 1, 0, 0, -Math.PI / 2);
  whaleBatch.add(sphere, whaleBelly, 1, -0.62, 0, 4.12, 0.91, 1.44);
  const fin = (points: number[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 1, 3, 1, 0]);
    geometry.computeVertexNormals();
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    return keep(geometry);
  };
  for (const side of [-1, 1]) {
    const flipper = fin([1.7, -0.4, side * 1.1, 0.6, -0.6, side * 1.55, -2.5, -1.2, side * 3.6, -0.6, -0.45, side * 2.2]);
    whaleBatch.add(flipper, whaleSkin, 0, 0, 0);
    whaleBatch.add(sphere, whaleEye, 3.55, 0.12, side * 1.2, 0.15, 0.15, 0.12);
    whaleBatch.add(sphere, ivory, 3.59, 0.16, side * 1.29, 0.045, 0.045, 0.025);
  }
  whaleBatch.add(fin([-1.8, 1.35, -0.18, -2.5, 2.4, 0, -0.1, 1.7, 0.1, -0.8, 1.4, 0.18]), whaleSkin, 0, 0, 0);
  const mouthPoints = [new THREE.Vector3(0.2, -0.55, 1.65), new THREE.Vector3(2.4, -0.42, 1.55), new THREE.Vector3(4.3, -0.32, 1.03), new THREE.Vector3(5.1, -0.12, 0.5)];
  const mouth = keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPoints), 18, 0.045, 4, false));
  whaleBatch.add(mouth, whaleEye, 0, 0, 0);
  // Fine throat pleats are geometry, not a texture download.
  for (let i = 0; i < 4; i++) whaleBatch.add(box, stone, 2.4, -1.2 + i * 0.06, 0.5 + i * 0.17, 3.4, 0.025, 0.035, 0, 0.09, 0.05);
  whaleBatch.finish();
  const tail = new THREE.Group();
  tail.position.x = -5.25;
  const tailBatch = batch(tail);
  for (const side of [-1, 1]) {
    const flukeOutline = new THREE.Shape();
    flukeOutline.moveTo(0.35, 0);
    flukeOutline.bezierCurveTo(-0.1, side * 1.1, -0.12, side * 2.3, -0.95, side * 3.25);
    flukeOutline.bezierCurveTo(-1.1, side * 2.75, -1.9, side * 2.1, -1.95, side * 1.45);
    flukeOutline.quadraticCurveTo(-1.92, side * 0.75, -1.0, side * 0.12);
    flukeOutline.lineTo(-1.35, 0);
    flukeOutline.closePath();
    const flukeGeometry = keep(new THREE.ShapeGeometry(flukeOutline, 8));
    flukeGeometry.rotateX(-Math.PI / 2);
    tailBatch.add(flukeGeometry, whaleSkin, 0, 0, 0);
  }
  tailBatch.finish();
  whale.add(tail);
  whale.scale.setScalar(1.35);
  whale.rotation.y = -0.32;
  group.add(whale);
  const splashMaterial = material("#b9e4dd", { transparent: true, opacity: 0.58, depthWrite: false });
  const splash = new THREE.InstancedMesh(ring, splashMaterial, 3);
  splash.name = "Whale water ripples";
  splash.frustumCulled = false;
  instances.push(splash);
  group.add(splash);

  let lastDistrict = -1;
  let lastBuildingTravel = Number.NaN;
  let lastWaterfront = Number.NaN;
  let lastPark = Number.NaN;
  let lastWheelAngle = Number.NaN;
  let portrait = false;

  const update = (distance: number, elapsed: number, reducedMotion: boolean) => {
    const route = positiveMod(distance, ROUTE_LENGTH);
    const districtName = getRailshiftDistrict(distance);
    const district = districtName === "waterfront" ? 1 : districtName === "park" ? 2 : 0;
    const waterfrontWeight = districtWeight(route, 1_000, 1_250);
    const parkWeight = districtWeight(route, 2_250, 2_500);
    const opening = Math.max(waterfrontWeight, parkWeight);
    if (lastDistrict !== district) {
      const palette = palettes[district]!;
      for (let i = 0; i < buildingCount; i++) buildings.setColorAt(i, palette[i % palette.length]!);
      if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
      lastDistrict = district;
    }
    // A landmark approaches from beyond the fog only in its own district. Its
    // geometry is fully hidden before visibility switches at either boundary.
    park.visible = parkWeight > 0;
    park.position.z = -145 + parkWeight * (portrait ? 85 : 98);
    skyline.position.z = -opening * 14;
    urbanDeck.visible = waterfrontWeight < 1;
    roadMaterial.opacity = sidewalkMaterial.opacity = roadMarkMaterial.opacity = 1 - waterfrontWeight;
    const buildingTravel = reducedMotion ? 0 : positiveMod(distance * 0.065, 130);
    if (buildingTravel !== lastBuildingTravel || waterfrontWeight !== lastWaterfront || parkWeight !== lastPark) {
      for (let i = 0; i < buildingCount; i++) {
        const b = buildingData[i]!;
        // Dense inner towers fill downtown. The appropriate side of the route
        // opens gradually for the waterfront or park, keeping its sightline clear.
        const sideOpening = b.x < 0 ? parkWeight : waterfrontWeight;
        const nearEdge = Math.abs(b.x) < 32 ? -47 - sideOpening * 52 : -49;
        const z = nearEdge - positiveMod(-49 - b.z - buildingTravel, 102);
        dummy.position.set(b.x, b.height / 2 - 6, z);
        dummy.scale.set(b.width, b.height, b.depth);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        buildings.setMatrixAt(i, dummy.matrix);
        dummy.position.y = b.height - 5.9;
        dummy.scale.set(b.width * 0.84, 0.55, b.depth * 0.84);
        dummy.updateMatrix();
        crowns.setMatrixAt(i, dummy.matrix);
        for (let row = 0; row < 6; row++) {
          dummy.position.set(b.x, b.height * (0.12 + row * 0.145) - 6, z + b.depth / 2 + 0.025);
          dummy.scale.set(b.width - 0.6, row % 2 ? 0.35 : 0.75, 0.04);
          dummy.updateMatrix();
          windows.setMatrixAt(i * 6 + row, dummy.matrix);
        }
      }
      buildings.instanceMatrix.needsUpdate = windows.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true;
      lastBuildingTravel = buildingTravel;
      lastWaterfront = waterfrontWeight;
      lastPark = parkWeight;
    }
    const angle = reducedMotion ? 0.13 : elapsed * 0.12 + 0.13;
    if (park.visible && angle !== lastWheelAngle) {
      rotatingWheel.rotation.z = angle;
      for (let i = 0; i < 12; i++) {
        const theta = angle + i / 12 * TAU;
        const x = Math.cos(theta) * 8.5;
        const y = Math.sin(theta) * 8.5;
        // Cabins translate around the rim but retain gravity-aligned axes.
        dummy.rotation.set(0, 0, 0);
        dummy.position.set(x, y - 1.06, 0);
        dummy.scale.set(1.35, 1.05, 1.25);
        dummy.updateMatrix();
        cabins.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, y - 0.82, 0.635);
        dummy.scale.set(1.0, 0.49, 0.035);
        dummy.updateMatrix();
        cabinWindows.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, y - 0.48, 0);
        dummy.scale.set(1.55, 0.18, 1.42);
        dummy.updateMatrix();
        cabinRoofs.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, y - 0.24, 0);
        dummy.scale.set(0.1, 0.5, 0.1);
        dummy.updateMatrix();
        cabinHangers.setMatrixAt(i, dummy.matrix);
      }
      cabins.instanceMatrix.needsUpdate = cabinWindows.instanceMatrix.needsUpdate = cabinRoofs.instanceMatrix.needsUpdate = cabinHangers.instanceMatrix.needsUpdate = true;
      lastWheelAngle = angle;
    }
    // One brief breach in every other waterfront visit. Distance, rather than a
    // repeating timer, makes it an encounter and guarantees no urban whale.
    const whaleVisit = Math.floor(Math.max(0, distance) / ROUTE_LENGTH) % 2 === 0;
    const breach = Math.max(0, Math.min(1, (route - 1_045) / 160));
    const arc = Math.sin(breach * Math.PI);
    whale.visible = whaleVisit && districtName === "waterfront" && route > 1_045 && route < 1_205;
    whale.position.set(portrait ? 21 : 23, -10 + arc * 7.2, portrait ? -60 : -46);
    whale.rotation.z = 0.54 - breach * 0.94;
    // Roll the flukes into view during the breach; an edge-on tail reads as a fish.
    tail.rotation.x = 0.72 + (reducedMotion ? 0 : Math.sin(elapsed * 2.8) * 0.2);
    splash.visible = whale.visible;
    for (let i = 0; splash.visible && i < 3; i++) {
      const ripple = reducedMotion ? i * 0.3 : positiveMod(elapsed * 0.23 + i / 3, 1);
      dummy.position.set(whale.position.x, -6.06 + i * 0.005, whale.position.z);
      dummy.scale.set(2.2 + ripple * 6.5, 0.9 + ripple * 2.9, 1);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      splash.setMatrixAt(i, dummy.matrix);
    }
    if (splash.visible) splash.instanceMatrix.needsUpdate = true;
  };
  update(0, 0, true);

  return {
    group,
    update,
    resize(aspect) {
      portrait = aspect < 0.85;
      // Narrow screens keep the complete landmark silhouettes beyond the lanes.
      park.position.x = portrait ? -20 : -25;
      park.scale.setScalar(portrait ? 0.78 : 1);
      whale.scale.setScalar(portrait ? 1.15 : 1.35);
    },
    dispose() {
      group.removeFromParent();
      for (const instance of instances) instance.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const mat of materials) mat.dispose();
      group.clear();
    },
  };
}
