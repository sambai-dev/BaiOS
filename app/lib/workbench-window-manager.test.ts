// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parseStrictWorkbenchSession,
  serializeWorkbenchCommittedState,
} from "./workbench-backup";
import { createDefaultWorkbenchFiles } from "./workbench-files";
import {
  createDefaultWorkbenchSession,
  type WorkbenchSession,
} from "./workbench-system";
import {
  focusWindow,
  getNextActiveInstanceId,
  openAppWindow,
  toggleMaximize,
} from "./workbench-window-manager";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mobile default window placement", () => {
  it.each([
    { width: 390, height: 844, expectedX: 35 },
    { width: 320, height: 568, expectedX: 0 },
  ])(
    "opens a persistable Agent window at $width×$height",
    ({ width, height, expectedX }) => {
      vi.stubGlobal("window", { innerWidth: width, innerHeight: height });

      const initial = createDefaultWorkbenchSession();
      const opened = openAppWindow(
        initial.windows,
        "agent",
        initial.activeWorkspaceId,
        {
          instanceId: `mobile-agent-${width}x${height}`,
          createdAt: initial.updatedAt + 1,
        },
      );
      const session: WorkbenchSession = {
        ...initial,
        activeInstances: {
          ...initial.activeInstances,
          [initial.activeWorkspaceId]: opened.activeInstanceId,
        },
        windows: opened.windows,
        updatedAt: initial.updatedAt + 1,
      };
      const agentWindow = session.windows.find(
        (windowState) => windowState.appId === "agent",
      );

      expect(agentWindow).toMatchObject({
        width: 320,
        x: expectedX,
      });
      expect(agentWindow?.height).toBeGreaterThanOrEqual(190);
      expect(agentWindow?.y).toBeGreaterThanOrEqual(0);
      expect(parseStrictWorkbenchSession(session)).toEqual(session);

      const serialized = serializeWorkbenchCommittedState(
        session,
        createDefaultWorkbenchFiles(),
        {
          committedAt: "2026-08-27T00:00:00.000Z",
          revision: `revision-mobile-${width}x${height}`,
        },
      );
      expect(serialized).toContain(`mobile-agent-${width}x${height}`);
    },
  );
});

describe("runtime window layers", () => {
  it("compacts repeated focus operations before the persisted layer ceiling", () => {
    const initial = createDefaultWorkbenchSession();
    const opened = openAppWindow(
      initial.windows,
      "agent",
      initial.activeWorkspaceId,
      {
        instanceId: "layer-agent",
        createdAt: initial.updatedAt + 1,
      },
    );
    const instanceIds = opened.windows.map((windowState) => windowState.instanceId);
    let windows = opened.windows;
    let activeInstanceId = opened.activeInstanceId;
    let nextZ = opened.nextZ;

    for (let index = 0; index < 256; index += 1) {
      const instanceId = instanceIds[index % instanceIds.length];
      if (!instanceId) throw new Error("Expected a focusable window instance.");
      const focused = focusWindow(windows, instanceId, nextZ);
      windows = focused.windows;
      activeInstanceId = focused.activeInstanceId;
      nextZ = focused.nextZ;
    }

    expect(Math.max(...windows.map((windowState) => windowState.z))).toBeLessThanOrEqual(
      64,
    );
    const session: WorkbenchSession = {
      ...initial,
      activeInstances: {
        ...initial.activeInstances,
        [initial.activeWorkspaceId]: activeInstanceId,
      },
      windows,
      updatedAt: initial.updatedAt + 2,
    };
    expect(parseStrictWorkbenchSession(session)).toEqual(session);
    expect(() =>
      serializeWorkbenchCommittedState(session, createDefaultWorkbenchFiles(), {
        committedAt: "2026-08-27T00:00:00.000Z",
        revision: "revision-repeated-focus",
      }),
    ).not.toThrow();
  });

  it("preserves array order when compacting equal-z windows", () => {
    const initial = createDefaultWorkbenchSession();
    const withAgent = openAppWindow(
      initial.windows,
      "agent",
      initial.activeWorkspaceId,
      { instanceId: "equal-layer-agent", createdAt: initial.updatedAt + 1 },
    );
    const withStack = openAppWindow(
      withAgent.windows,
      "stack",
      initial.activeWorkspaceId,
      { instanceId: "equal-layer-stack", createdAt: initial.updatedAt + 2 },
    );
    const equalLayers = withStack.windows.map((windowState, index) => ({
      ...windowState,
      z: 64,
      createdAt: initial.updatedAt + 100 - index,
    }));

    const focused = focusWindow(equalLayers, "equal-layer-stack", 65);
    expect(focused.windows.map((windowState) => windowState.instanceId)).toEqual(
      equalLayers.map((windowState) => windowState.instanceId),
    );
    expect(
      focused.windows.find((windowState) => windowState.instanceId === "build-now")?.z,
    ).toBe(1);
    expect(
      focused.windows.find(
        (windowState) => windowState.instanceId === "equal-layer-agent",
      )?.z,
    ).toBe(2);
    expect(
      focused.windows.find(
        (windowState) => windowState.instanceId === "equal-layer-stack",
      )?.z,
    ).toBe(4);
  });

  it("selects the visually frontmost array entry when z values are equal", () => {
    const initial = createDefaultWorkbenchSession();
    const withAgent = openAppWindow(
      initial.windows,
      "agent",
      initial.activeWorkspaceId,
      { instanceId: "equal-active-agent", createdAt: initial.updatedAt + 100 },
    );
    const equalLayers = withAgent.windows.map((windowState, index) => ({
      ...windowState,
      z: 5,
      // Deliberately oppose creation order to prove it cannot override the
      // persisted/rendered array order.
      createdAt: initial.updatedAt + 100 - index,
    }));

    expect(getNextActiveInstanceId(equalLayers, "build")).toBe(
      "equal-active-agent",
    );
  });
});

describe("defensive maximize restoration", () => {
  it("uses authored placement when a maximized window has no restore bounds", () => {
    vi.stubGlobal("window", undefined);
    const initial = createDefaultWorkbenchSession();
    const original = initial.windows[0];
    if (!original) throw new Error("Expected the default Now window.");
    const maximized = {
      ...original,
      x: 0,
      y: 0,
      width: 1_440,
      height: 900,
      maximized: true,
      restoreBounds: null,
    };

    const restored = toggleMaximize([maximized], maximized.instanceId, 2);
    expect(restored.windows[0]).toMatchObject({
      x: original.x,
      y: original.y,
      width: original.width,
      height: original.height,
      maximized: false,
      restoreBounds: null,
    });
  });
});

describe("large-display default window placement", () => {
  it("opens a persistable centered Agent window at 8K", () => {
    vi.stubGlobal("window", { innerWidth: 7_680, innerHeight: 4_320 });
    const initial = createDefaultWorkbenchSession();
    const opened = openAppWindow(
      initial.windows,
      "agent",
      initial.activeWorkspaceId,
      {
        instanceId: "8k-agent",
        createdAt: initial.updatedAt + 1,
      },
    );
    const session: WorkbenchSession = {
      ...initial,
      activeInstances: {
        ...initial.activeInstances,
        [initial.activeWorkspaceId]: opened.activeInstanceId,
      },
      windows: opened.windows,
      updatedAt: initial.updatedAt + 1,
    };
    const agentWindow = opened.windows.find(
      (windowState) => windowState.instanceId === "8k-agent",
    );

    expect(agentWindow).toMatchObject({
      x: 3_250,
      y: 1_741,
      width: 1_180,
      height: 760,
    });
    expect(parseStrictWorkbenchSession(session)).toEqual(session);
    expect(() =>
      serializeWorkbenchCommittedState(session, createDefaultWorkbenchFiles(), {
        committedAt: "2026-08-27T00:00:00.000Z",
        revision: "revision-8k-placement",
      }),
    ).not.toThrow();
  });
});
