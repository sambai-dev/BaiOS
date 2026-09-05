// SPDX-License-Identifier: AGPL-3.0-or-later
// Original procedural surf deck; resources are disposed with the rider scene.
import * as THREE from "three";

export function createRailshiftBoard(material: {
  rail: THREE.Material; grip: THREE.Material; light: THREE.Material; sole: THREE.Material;
}) {
  const group = new THREE.Group();
  group.name = "Cityline shaped hoverboard";
  // Nose and tail rise from a flat standing area. A six-sided section creates
  // a thin beveled rail instead of the previous rectangular platform.
  const sections = [
    [-1.30, 0.035, 0.43], [-1.17, 0.23, 0.36], [-0.88, 0.43, 0.28],
    [-0.48, 0.51, 0.275], [0.43, 0.48, 0.275], [0.82, 0.37, 0.33], [1.05, 0.12, 0.43],
  ];
  const positions: number[] = [];
  const indices: number[][] = [[], [], []];
  for (const [z, width, y] of sections) {
    const bevel = Math.min(0.05, width! * 0.35);
    for (const [x, height] of [
      [-width!, y! - 0.035], [-width! + bevel, y!], [width! - bevel, y!],
      [width!, y! - 0.035], [width! - bevel, y! - 0.135], [-width! + bevel, y! - 0.135],
    ]) positions.push(x!, height!, z!);
  }
  for (let row = 0; row < sections.length - 1; row++) {
    for (let side = 0; side < 6; side++) {
      const a = row * 6 + side, b = row * 6 + (side + 1) % 6;
      const c = b + 6, d = a + 6;
      indices[side === 1 ? 1 : side === 4 ? 2 : 0]!.push(a, d, b, b, d, c);
    }
  }
  for (let side = 1; side < 5; side++) {
    indices[0]!.push(0, side, side + 1);
    const end = (sections.length - 1) * 6;
    indices[0]!.push(end, end + side + 1, end + side);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices.flat());
  let offset = 0;
  indices.forEach((faces, index) => { geometry.addGroup(offset, faces.length, index); offset += faces.length; });
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, [material.rail, material.grip, material.sole]));

  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new THREE.Mesh(box, mat);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); group.add(mesh); return mesh;
  };
  // Two separate pads make the staggered stance readable from the chase camera.
  add(material.sole, -0.23, 0.287, -0.30, 0.29, 0.018, 0.48).rotation.y = 0.20;
  add(material.sole, 0.23, 0.287, 0.30, 0.29, 0.018, 0.48).rotation.y = -0.16;
  for (const side of [-1, 1]) {
    add(material.light, side * 0.458, 0.202, 0, 0.024, 0.027, 1.12);
    add(material.rail, side * 0.27, 0.10, 0.59, 0.12, 0.12, 0.38);
    add(material.light, side * 0.27, 0.10, 0.79, 0.074, 0.055, 0.025);
  }
  // The underside flashes into view during a kickflip. A slim central light
  // and two orange braces make a full turn readable from the chase camera.
  add(material.light, 0, 0.134, -0.04, 0.10, 0.012, 0.72);
  for (const side of [-1, 1]) {
    add(material.rail, side * 0.20, 0.134, -0.04, 0.035, 0.012, 0.58).rotation.y = side * 0.36;
  }
  // A restrained nose mark follows the deck's raised leading edge.
  add(material.light, -0.075, 0.321, -0.96, 0.035, 0.016, 0.23).rotation.set(0.25, -0.30, 0);
  add(material.light, 0.075, 0.321, -0.96, 0.035, 0.016, 0.23).rotation.set(0.25, 0.30, 0);
  return group;
}
