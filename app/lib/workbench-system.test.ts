// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";

import {
  WORKBENCH_COORDINATE_LIMIT,
  createDefaultWorkbenchSession,
  getWorkbenchApp,
  parseWorkbenchSession,
} from "./workbench-system";

describe("workbench session defaults", () => {
  it("starts a fresh visitor in Build with only Now active", () => {
    const session = createDefaultWorkbenchSession();

    expect(session.activeWorkspaceId).toBe("build");
    expect(session.activeInstances).toEqual({
      build: "build-now",
      field: null,
      notes: null,
    });
    expect(session.windows).toHaveLength(1);
    expect(session.windows[0]).toMatchObject({
      instanceId: "build-now",
      appId: "now",
      workspaceId: "build",
      z: 1,
      open: true,
      minimized: false,
    });
  });

  it("gives the Now orientation enough room to lead the desktop", () => {
    expect(getWorkbenchApp("now")).toMatchObject({
      defaultWidth: 540,
      defaultHeight: 500,
    });
    expect(createDefaultWorkbenchSession().windows[0]).toMatchObject({
      width: 540,
      height: 500,
      x: 48,
      y: 36,
    });
  });

  it("keeps truthful proof-surface identities on stable ids and aliases", () => {
    expect(getWorkbenchApp("book")).toMatchObject({
      label: "Project brief",
      keywords: expect.arrayContaining(["book", "consult", "scope"]),
    });
    expect(getWorkbenchApp("sandbox")).toMatchObject({
      label: "Projects",
      keywords: expect.arrayContaining(["sandbox", "case study"]),
    });
    expect(getWorkbenchApp("agent")).toMatchObject({
      label: "Ask about Sam",
    });
  });

  it("preserves existing Now geometry while new sessions use the larger default", () => {
    const session = createDefaultWorkbenchSession();
    const existingSession = {
      ...session,
      windows: session.windows.map((windowState) => ({
        ...windowState,
        height: 335,
      })),
    };

    expect(parseWorkbenchSession(existingSession)?.windows[0]?.height).toBe(335);
  });

  it("preserves 8K-scale window and restore coordinates", () => {
    const session = createDefaultWorkbenchSession();
    const x = 7_680;
    const y = 4_320;
    const existingSession = {
      ...session,
      windows: session.windows.map((windowState) => ({
        ...windowState,
        x,
        y,
        restoreBounds: {
          x: -x,
          y: -y,
          width: windowState.width,
          height: windowState.height,
        },
      })),
    };

    const parsed = parseWorkbenchSession(existingSession)?.windows[0];
    expect(WORKBENCH_COORDINATE_LIMIT).toBeGreaterThanOrEqual(x);
    expect(parsed).toMatchObject({
      x,
      y,
      restoreBounds: { x: -x, y: -y },
    });
  });

  it("repairs missing restore geometry for managed window layouts", () => {
    const session = createDefaultWorkbenchSession();
    const existingSession = {
      ...session,
      windows: session.windows.map((windowState) => ({
        ...windowState,
        x: 0,
        y: 0,
        width: 1_440,
        height: 900,
        maximized: true,
        snap: "left" as const,
        restoreBounds: null,
      })),
    };

    expect(parseWorkbenchSession(existingSession)?.windows[0]).toMatchObject({
      maximized: true,
      snap: null,
      restoreBounds: {
        x: 48,
        y: 36,
        width: 540,
        height: 500,
      },
    });
  });
});
