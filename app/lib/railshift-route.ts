// SPDX-License-Identifier: AGPL-3.0-or-later
export const RAILSHIFT_ROUTE_LENGTH = 3_000;
export type RailshiftDistrict = "downtown" | "waterfront" | "park";

/** The city occupies ten of twelve checkpoint stretches in each route loop. */
export function getRailshiftDistrict(distance: number): RailshiftDistrict {
  const route = ((distance % RAILSHIFT_ROUTE_LENGTH) + RAILSHIFT_ROUTE_LENGTH) % RAILSHIFT_ROUTE_LENGTH;
  if (route >= 1_000 && route < 1_250) return "waterfront";
  if (route >= 2_250 && route < 2_500) return "park";
  return "downtown";
}
