// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createRiderLegIK } from "./railshift-rider-ik";

function makeLeg(upper = 0.34, lower = 0.34) {
  const body = new THREE.Group();
  const hip = new THREE.Group();
  const knee = new THREE.Group();
  const foot = new THREE.Group();
  hip.position.set(0.2, 0.9, 0);
  knee.position.set(0, -upper, 0);
  foot.position.set(0, -lower, 0);
  body.add(hip);
  hip.add(knee);
  knee.add(foot);
  return { body, hip, knee, foot, ik: createRiderLegIK(hip, knee, foot, upper, lower) };
}

const actualAnkle = (leg: ReturnType<typeof makeLeg>) => {
  leg.body.updateMatrixWorld(true);
  return leg.body.worldToLocal(leg.foot.getWorldPosition(new THREE.Vector3()));
};

describe("Railshift planted rider legs", () => {
  it("places both ankles exactly on reachable deck targets through crouching and carving", () => {
    for (const side of [-1, 1]) {
      const leg = makeLeg();
      leg.hip.position.x = side * 0.2;
      for (let step = 0; step <= 80; step++) {
        const phase = step / 80 * Math.PI * 2;
        leg.hip.position.y = 0.82 + Math.cos(phase) * 0.08;
        const target = new THREE.Vector3(side * 0.23 + Math.sin(phase) * 0.09, 0.35 + Math.sin(phase) * 0.05, side * 0.25);
        const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(phase) * 0.15, side === -1 ? 0.15 : -0.2, Math.sin(phase) * 0.24));
        leg.ik.solve(target, orientation);
        expect(actualAnkle(leg).distanceTo(target)).toBeLessThan(1e-8);
        expect(leg.foot.getWorldQuaternion(new THREE.Quaternion()).angleTo(orientation)).toBeLessThan(1e-7);
      }
    }
  });

  it("keeps ankle and sole orientation correct under a transformed body parent", () => {
    const leg = makeLeg();
    leg.body.position.set(3, 2, -4);
    leg.body.rotation.set(0.3, -0.4, 0.25);
    const target = new THREE.Vector3(0.23, 0.35, -0.3);
    const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0.15, 0.3));
    leg.ik.solve(target, orientation);
    expect(actualAnkle(leg).distanceTo(target)).toBeLessThan(1e-8);
    const expectedWorld = leg.body.getWorldQuaternion(new THREE.Quaternion()).multiply(orientation);
    expect(leg.foot.getWorldQuaternion(new THREE.Quaternion()).angleTo(expectedWorld)).toBeLessThan(1e-7);
  });

  it("bends the knees toward forward minus Z and survives a pole-aligned ankle", () => {
    const leg = makeLeg();
    const target = leg.hip.position.clone().add(new THREE.Vector3(0, -0.5, 0));
    leg.ik.solve(target, new THREE.Quaternion());
    leg.body.updateMatrixWorld(true);
    expect(leg.knee.getWorldPosition(new THREE.Vector3()).z).toBeLessThan(-0.1);
    for (const z of [-0.5, 0.5]) {
      target.copy(leg.hip.position).add(new THREE.Vector3(0, 0, z));
      leg.ik.solve(target, new THREE.Quaternion());
      expect(actualAnkle(leg).distanceTo(target)).toBeLessThan(1e-8);
      expect(leg.foot.matrixWorld.elements.every(Number.isFinite)).toBe(true);
    }
  });

  it("clamps far and too-close targets without stretching or producing nonfinite transforms", () => {
    for (const [upper, lower] of [[0.34, 0.34], [0.4, 0.2]] as const) {
      const leg = makeLeg(upper, lower);
      for (const offset of [new THREE.Vector3(2, -8, 3), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.68, 0), new THREE.Vector3(0, -0.68, 0)]) {
        const target = leg.hip.position.clone().add(offset);
        leg.ik.solve(target, new THREE.Quaternion());
        const ankle = actualAnkle(leg);
        const expectedReach = THREE.MathUtils.clamp(offset.length(), Math.abs(upper - lower), upper + lower);
        expect(ankle.distanceTo(leg.hip.position)).toBeCloseTo(expectedReach, 8);
        expect(leg.foot.matrixWorld.elements.every(Number.isFinite)).toBe(true);
        expect(leg.foot.getWorldQuaternion(new THREE.Quaternion()).angleTo(new THREE.Quaternion())).toBeLessThan(1e-7);
      }
    }
  });

  it("does not mutate targets and rejects invalid bone lengths", () => {
    const leg = makeLeg();
    const target = new THREE.Vector3(0.23, 0.35, -0.3);
    const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.2, 0.1));
    const targetBefore = target.toArray();
    const orientationBefore = orientation.toArray();
    leg.ik.solve(target, orientation);
    expect(target.toArray()).toEqual(targetBefore);
    expect(orientation.toArray()).toEqual(orientationBefore);
    expect(() => makeLeg(0, 0.3)).toThrow(RangeError);
    expect(() => makeLeg(Infinity, 0.3)).toThrow(RangeError);
  });

  it("supports a board-aligned pole under a deep torso pitch without moving the ankle", () => {
    const leg = makeLeg();
    leg.body.rotation.set(-0.98, 0.28, 0);
    const pivot = new THREE.Vector3(0, 0.9, 0);
    leg.body.position.set(0, -0.335, 0.18).add(pivot).sub(pivot.clone().applyQuaternion(leg.body.quaternion));
    leg.body.updateMatrixWorld(true);
    const worldTarget = new THREE.Vector3(0.23, 0.402, 0.3);
    const target = leg.body.worldToLocal(worldTarget.clone());
    const inverseBody = leg.body.quaternion.clone().invert();
    const pole = new THREE.Vector3(0, 1, -0.65).applyQuaternion(inverseBody);
    const before = pole.toArray();
    leg.ik.solve(target, inverseBody, pole);
    leg.body.updateMatrixWorld(true);
    expect(leg.foot.getWorldPosition(new THREE.Vector3()).distanceTo(worldTarget)).toBeLessThan(1e-8);
    expect(leg.knee.getWorldPosition(new THREE.Vector3()).y).toBeGreaterThan(worldTarget.y);
    expect(pole.toArray()).toEqual(before);
    for (const aligned of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1)]) {
      const ankle = leg.hip.position.clone().addScaledVector(aligned, 0.5);
      leg.ik.solve(ankle, new THREE.Quaternion(), aligned);
      expect(actualAnkle(leg).distanceTo(ankle)).toBeLessThan(1e-8);
    }
  });
});
