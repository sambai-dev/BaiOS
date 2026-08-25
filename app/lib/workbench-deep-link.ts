// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import {
  isWorkbenchAppId,
  isWorkspaceId,
  type WorkbenchAppId,
  type WorkspaceId,
} from "./workbench-system";

export type WorkbenchDeepLink = Readonly<{
  /** True when the URL asks for the Workbench to open at all. */
  requested: boolean;
  /** Validated target app; null when the param is absent or unknown. */
  appId: WorkbenchAppId | null;
  /** Validated target workspace; null when the param is absent or unknown. */
  workspaceId: WorkspaceId | null;
}>;

/**
 * Read side of the Workbench deep links (?app=, ?workspace=, ?open, ?workbench).
 * Unknown ids resolve to null so a shared URL always falls back safely to the
 * restored/default session instead of throwing or opening nothing.
 */
export function parseWorkbenchDeepLink(search: string): WorkbenchDeepLink {
  const params = new URLSearchParams(search);
  const app = params.get("app");
  const workspace = params.get("workspace");
  return {
    requested:
      app !== null ||
      workspace !== null ||
      params.get("open") !== null ||
      params.get("workbench") !== null,
    appId: isWorkbenchAppId(app) ? app : null,
    workspaceId: isWorkspaceId(workspace) ? workspace : null,
  };
}
