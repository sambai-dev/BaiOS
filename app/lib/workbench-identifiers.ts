// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

export const workbenchAppIds = [
  "now",
  "stack",
  "method",
  "scratch",
  "console",
  "links",
  "pulse",
  "book",
  "sandbox",
  "agent",
  "lab",
  "railshift",
  "vector",
  "archive",
  "search",
  "control",
] as const;

export type WorkbenchAppId = (typeof workbenchAppIds)[number];

export const workspaceIds = ["build", "field", "notes"] as const;
export type WorkspaceId = (typeof workspaceIds)[number];

export function isWorkbenchAppId(value: unknown): value is WorkbenchAppId {
  return typeof value === "string" && workbenchAppIds.includes(value as WorkbenchAppId);
}

export function isWorkspaceId(value: unknown): value is WorkspaceId {
  return typeof value === "string" && workspaceIds.includes(value as WorkspaceId);
}
