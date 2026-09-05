// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

export type Vector3 = [number, number, number];
export type MissionId = "dock" | "thrust" | "lift" | "explore";

export interface MissionDefinition {
  id: MissionId;
  title: string;
  description: string;
  instruction: string;
  meaning: string;
  initialA: Vector3;
  initialB: Vector3;
  fixedB: boolean;
}

export interface MissionEvaluation {
  output: Vector3;
  target: Vector3;
  error: number;
  success: boolean;
  score: number;
  feedback: string;
}

export const missionDefinitions: MissionDefinition[] = [
  {
    id: "dock",
    title: "Dock the probe",
    description: "Two thrusters. One landing point.",
    instruction: "Adjust A and B so their combined movement reaches the target at (2, 1, 0).",
    meaning: "Adding vectors combines movements. Different pairs of thrusters can reach the same destination.",
    initialA: [2, 0, 1],
    initialB: [-1, 2, 0],
    fixedB: false,
  },
  {
    id: "thrust",
    title: "Tune the thrust",
    description: "Put every bit of force to work.",
    instruction: "Aim A along the fixed guide B, then match its length. Remove sideways force to reach (2, 1, 0).",
    meaning: "Projection separates useful forward force from sideways waste. Pointing backward produces reverse thrust.",
    initialA: [1, 3, 2],
    initialB: [2, 1, 0],
    fixedB: true,
  },
  {
    id: "lift",
    title: "Create lift",
    description: "Turn two directions into a third.",
    instruction: "Adjust A so A × B reaches the lift target at (0, 3, 0). B stays fixed along the Z axis.",
    meaning: "A cross product points perpendicular to both inputs. Reversing a vector reverses the lift; parallel vectors produce none.",
    initialA: [1, 1, 0],
    initialB: [0, 0, 2],
    fixedB: true,
  },
  {
    id: "explore",
    title: "Free exploration",
    description: "Follow an idea. See what changes.",
    instruction: "Move either vector and compare their sum, angle, projection, and cross product.",
    meaning: "Try equal vectors, opposite vectors, and a right angle. Each arrangement reveals a different relationship.",
    initialA: [2, 1, 0],
    initialB: [-1, 2, 1],
    fixedB: false,
  },
];

export function magnitude(vector: Vector3): number {
  return Math.hypot(...vector);
}

export function dot(a: Vector3, b: Vector3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vector3, b: Vector3): Vector3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function add(a: Vector3, b: Vector3): Vector3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale(vector: Vector3, factor: number): Vector3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

export function distance(a: Vector3, b: Vector3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function angleDegrees(a: Vector3, b: Vector3): number | null {
  const aLength = magnitude(a);
  const bLength = magnitude(b);
  if (aLength === 0 || bLength === 0) return null;

  const cosine = dot(scale(a, 1 / aLength), scale(b, 1 / bLength));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

export function projection(vector: Vector3, direction: Vector3): Vector3 {
  const length = magnitude(direction);
  if (length === 0) return [0, 0, 0];

  const unitDirection = scale(direction, 1 / length);
  return scale(unitDirection, dot(vector, unitDirection));
}

function missionScore(error: number, target: Vector3, success: boolean): number {
  if (success) return 100;
  return Math.max(0, Math.min(99, Math.round(100 * (1 - error / (magnitude(target) + 2)))));
}

export function evaluateMission(id: MissionId, a: Vector3, b: Vector3): MissionEvaluation {
  if (id === "explore") {
    return {
      output: add(a, b),
      target: [0, 0, 0],
      error: 0,
      success: false,
      score: 0,
      feedback: "No target to chase. Try making the vectors parallel, opposite, or perpendicular.",
    };
  }

  const target: Vector3 = id === "lift" ? [0, 3, 0] : [2, 1, 0];
  const output = id === "lift" ? cross(a, b) : id === "thrust" ? projection(a, b) : add(a, b);
  const sidewaysWaste = id === "thrust" ? distance(a, output) : 0;
  // With B on the target axis, this is exactly distance(A, target).
  // Checking both terms also prevents an invalid guide from passing a mission.
  const error = Math.hypot(distance(output, target), sidewaysWaste);
  const tolerance = id === "lift" ? 0.3 : 0.25;
  const success = error <= tolerance + Number.EPSILON * 8;
  let feedback: string;

  if (id === "dock") {
    feedback = success
      ? "Docked. Both thrusters combine to reach the landing point."
      : `${error.toFixed(2)} units from the dock. Move either thruster to bring the combined vector onto the target.`;
  } else if (id === "lift") {
    feedback = success
      ? "Lift established. The cross product points upward with the right strength."
      : magnitude(output) === 0
        ? "No lift yet. Parallel vectors produce zero; give A a direction across B."
        : output[1] < 0
          ? "The force points downward. Reverse A's X direction to create upward lift."
          : `${error.toFixed(2)} units from the lift target. Adjust A's X direction for height and Y direction to remove sideways force.`;
  } else {
    const bLength = magnitude(b);
    const forwardThrust = bLength === 0 ? 0 : dot(a, scale(b, 1 / bLength));
    feedback = success
      ? "Thrust tuned. Your force follows the guide and reaches the target with almost no sideways waste."
      : forwardThrust < 0
        ? `Reverse thrust. Turn A toward B; ${sidewaysWaste.toFixed(2)} units are also lost sideways.`
        : `${forwardThrust.toFixed(2)} units of forward thrust; ${sidewaysWaste.toFixed(2)} wasted sideways. Match the guide's direction and length.`;
  }

  return { output, target, error, success, score: missionScore(error, target, success), feedback };
}
