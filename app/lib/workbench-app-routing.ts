// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import {
  getWorkbenchApp,
  workspaceIds,
  type WorkbenchAppId,
  type WorkbenchSession,
  type WorkspaceId,
} from "./workbench-system";
import {
  openAppWindow,
  switchWorkspaceActiveInstance,
  type OpenAppWindowOptions,
} from "./workbench-window-manager";

/** Organize legacy windows without changing their identity, content, or layout. */
export function organizeWorkbenchSession(session: WorkbenchSession): WorkbenchSession {
  const windows = session.windows.map((windowState) => {
    const workspaceId = getWorkbenchApp(windowState.appId).defaultWorkspaceId;
    return windowState.workspaceId === workspaceId
      ? windowState
      : { ...windowState, workspaceId };
  });
  if (windows.every((windowState, index) => windowState === session.windows[index])) {
    return session;
  }

  const previousActiveId = session.activeInstances[session.activeWorkspaceId];
  const activeWindow = windows.find(
    (windowState) => windowState.instanceId === previousActiveId &&
      windowState.open && !windowState.minimized,
  );
  const activeWorkspaceId = activeWindow?.workspaceId ?? session.activeWorkspaceId;
  const activeInstances = Object.fromEntries(
    workspaceIds.map((workspaceId) => [
      workspaceId,
      switchWorkspaceActiveInstance(
        windows,
        workspaceId,
        workspaceId === activeWorkspaceId
          ? previousActiveId
          : session.activeInstances[workspaceId],
      ),
    ]),
  ) as Record<WorkspaceId, string | null>;
  return { ...session, windows, activeWorkspaceId, activeInstances };
}

/** Launcher, shortcuts, and app deep links share the same workspace routing. */
export function openWorkbenchApplication(
  session: WorkbenchSession,
  appId: WorkbenchAppId,
  options: OpenAppWindowOptions = {},
) {
  const organized = organizeWorkbenchSession(session);
  const workspaceId = getWorkbenchApp(appId).defaultWorkspaceId;
  const result = openAppWindow(organized.windows, appId, workspaceId, options);
  return {
    ...result,
    session: {
      ...organized,
      windows: result.windows,
      activeWorkspaceId: workspaceId,
      activeInstances: {
        ...organized.activeInstances,
        [workspaceId]: result.activeInstanceId,
      },
    } satisfies WorkbenchSession,
  };
}

/** Keep shared links consistent with the workspace and window actually shown. */
export function getWorkbenchSessionUrl(href: string, session: WorkbenchSession): string {
  const url = new URL(href);
  const active = session.windows.find(
    (windowState) =>
      windowState.instanceId === session.activeInstances[session.activeWorkspaceId] &&
      windowState.workspaceId === session.activeWorkspaceId &&
      windowState.open && !windowState.minimized,
  );
  url.searchParams.set("workspace", session.activeWorkspaceId);
  if (active) url.searchParams.set("app", active.appId);
  else url.searchParams.delete("app");
  return url.toString();
}
