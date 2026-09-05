// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from "three";

/** Two down-Y bones; target and sole orientation are relative to hip.parent. */
export function createRiderLegIK(
  hip: THREE.Group,
  knee: THREE.Group,
  foot: THREE.Group,
  upperLength: number,
  lowerLength: number,
) {
  if (!(upperLength > 0 && lowerLength > 0 && Number.isFinite(upperLength + lowerLength))) {
    throw new RangeError("Rider leg lengths must be finite and positive.");
  }

  const down = new THREE.Vector3(0, -1, 0);
  const direction = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const upperDirection = new THREE.Vector3();
  const lowerDirection = new THREE.Vector3();
  const lowerOrientation = new THREE.Quaternion();
  const desiredOrientation = new THREE.Quaternion();
  const inverse = new THREE.Quaternion();
  const minimumReach = Math.abs(upperLength - lowerLength);
  const maximumReach = upperLength + lowerLength;

  return {
    solve(target: THREE.Vector3, footOrientation: THREE.Quaternion, poleDirection?: THREE.Vector3): void {
      direction.subVectors(target, hip.position);
      let distance = direction.length();
      if (!Number.isFinite(distance)) {
        direction.copy(down);
        distance = maximumReach;
      } else if (distance > 1e-10) {
        direction.multiplyScalar(1 / distance);
      } else {
        direction.copy(down);
      }
      distance = THREE.MathUtils.clamp(distance, minimumReach, maximumReach);

      // A caller may keep the knee pole aligned with the board while the torso
      // pitches. Both the supplied direction and target are hip-parent local.
      if (poleDirection && Number.isFinite(poleDirection.lengthSq()) && poleDirection.lengthSq() > 1e-20) pole.copy(poleDirection);
      else pole.set(0, 0, -1);
      pole.addScaledVector(direction, -pole.dot(direction));
      if (pole.lengthSq() < 1e-10) {
        if (Math.abs(direction.x) < 0.8) pole.set(1, 0, 0);
        else pole.set(0, 0, 1);
        pole.addScaledVector(direction, -pole.dot(direction));
      }
      pole.normalize();
      const cosine = distance > 1e-10
        ? THREE.MathUtils.clamp((upperLength * upperLength + distance * distance - lowerLength * lowerLength) / (2 * upperLength * distance), -1, 1)
        : 0;
      const sine = Math.sqrt(Math.max(0, 1 - cosine * cosine));
      upperDirection.copy(direction).multiplyScalar(cosine).addScaledVector(pole, sine).normalize();
      lowerDirection.copy(direction).multiplyScalar(distance).addScaledVector(upperDirection, -upperLength).normalize();

      hip.quaternion.setFromUnitVectors(down, upperDirection);
      lowerOrientation.setFromUnitVectors(down, lowerDirection);
      knee.quaternion.copy(inverse.copy(hip.quaternion).invert()).multiply(lowerOrientation);

      // Cancel both bone rotations so the sole follows the board, not the shin.
      desiredOrientation.copy(footOrientation);
      if (!Number.isFinite(desiredOrientation.lengthSq()) || desiredOrientation.lengthSq() < 1e-20) {
        desiredOrientation.identity();
      } else {
        desiredOrientation.normalize();
      }
      foot.quaternion.copy(inverse.copy(lowerOrientation).invert()).multiply(desiredOrientation);
    },
  };
}
