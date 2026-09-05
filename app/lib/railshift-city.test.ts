// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { createRailshiftCity, getRailshiftDistrict, type RailshiftCity } from "./railshift-city";

const created: RailshiftCity[] = [];
const makeCity = () => {
  const city = createRailshiftCity();
  created.push(city);
  return city;
};
afterEach(() => { for (const city of created.splice(0)) city.dispose(); });

const transforms = (group: THREE.Group) => {
  const result: number[] = [];
  group.updateMatrixWorld(true);
  group.traverse((item) => {
    result.push(...item.matrix.elements, Number(item.visible));
    if (item instanceof THREE.InstancedMesh) result.push(...item.instanceMatrix.array);
  });
  return result;
};

describe("Railshift district scenery", () => {
  it("starts and restarts in a city without the park, whale or water ripples", () => {
    const city = makeCity();
    const park = city.group.getObjectByName("Lantern Pier amusement park")!;
    const whale = city.group.getObjectByName("Harbour whale")!;
    const ripples = city.group.getObjectByName("Whale water ripples")!;
    for (const reducedMotion of [false, true]) {
      city.update(1_125, 55, reducedMotion);
      city.update(0, 0, reducedMotion);
      expect(getRailshiftDistrict(0)).toBe("downtown");
      expect([park.visible, whale.visible, ripples.visible]).toEqual([false, false, false]);
    }
  });

  it("keeps more than 80% of a long route urban and confines each landmark to its district", () => {
    const city = makeCity();
    const park = city.group.getObjectByName("Lantern Pier amusement park")!;
    const whale = city.group.getObjectByName("Harbour whale")!;
    let downtownSamples = 0;
    for (let distance = 0; distance < 9_000; distance += 20) {
      city.update(distance, distance / 25, false);
      const district = getRailshiftDistrict(distance);
      if (district === "downtown") downtownSamples++;
      if (park.visible) expect(district).toBe("park");
      if (whale.visible) expect(district).toBe("waterfront");
      expect(park.visible && whale.visible).toBe(false);
    }
    expect(downtownSamples / 450).toBeGreaterThan(0.8);
  });

  it("makes the whale a single water breach on alternating waterfront visits", () => {
    const city = makeCity();
    const whale = city.group.getObjectByName("Harbour whale")!;
    for (const [distance, visible] of [[1_000, false], [1_044, false], [1_125, true], [1_206, false], [1_250, false], [4_125, false], [7_125, true]] as const) {
      city.update(distance, 0, false);
      expect(whale.visible, `whale at ${distance} m`).toBe(visible);
    }
    city.update(1_046, 0, false);
    const entryY = whale.position.y;
    city.update(1_125, 0, false);
    expect(whale.position.y).toBeGreaterThan(entryY + 6);
    city.update(1_204, 0, false);
    expect(whale.position.y).toBeLessThan(-9);
  });

  it("brings the park from beyond the fog and removes it before downtown returns", () => {
    const city = makeCity();
    const park = city.group.getObjectByName("Lantern Pier amusement park")!;
    city.update(2_250, 0, false);
    expect(park.visible).toBe(false);
    expect(park.position.z).toBeLessThan(-130);
    city.update(2_251, 0, false);
    expect(park.position.z).toBeLessThan(-130);
    city.update(2_300, 0, false);
    expect(park.visible).toBe(true);
    expect(park.position.z).toBeGreaterThan(-70);
    city.update(2_499, 0, false);
    expect(park.position.z).toBeLessThan(-130);
    city.update(2_500, 0, false);
    expect(park.visible).toBe(false);
  });

  it("keeps reduced-motion scenes stable while still showing the correct district", () => {
    const city = makeCity();
    city.resize(0.65);
    for (const distance of [0, 1_125, 2_350, 3_000]) {
      city.update(distance, 0, true);
      const before = transforms(city.group);
      city.update(distance, 100, true);
      expect(transforms(city.group)).toEqual(before);
    }
  });

  it("keeps retained scenery bounded and all route transforms finite", () => {
    const city = makeCity();
    let meshes = 0;
    let triangles = 0;
    city.group.traverse((item) => {
      if (!(item instanceof THREE.Mesh)) return;
      meshes++;
      triangles += (item.geometry.index?.count ?? item.geometry.attributes.position!.count) / 3 * (item instanceof THREE.InstancedMesh ? item.count : 1);
    });
    expect(meshes).toBeLessThan(55);
    expect(triangles).toBeLessThan(55_000);
    for (let distance = 0; distance < 10_000; distance += 127) {
      city.update(distance, distance / 30, false);
      expect(transforms(city.group).every(Number.isFinite)).toBe(true);
    }
  });
});
