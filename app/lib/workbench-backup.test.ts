// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";

import {
  migrateLegacyWorkbenchSession,
  parseStrictWorkbenchSession,
} from "./workbench-backup";
import {
  WORKBENCH_COORDINATE_LIMIT,
  createDefaultWorkbenchSession,
  createWindowInstance,
  workbenchStorageKeys,
  type WorkbenchSession,
} from "./workbench-system";

function createStorage(values: Record<string, string | null>) {
  return {
    getItem(key: string) {
      return values[key] ?? null;
    },
  };
}

describe("strict workbench session parsing", () => {
  it("preserves an ordinary valid saved session", () => {
    const seed = createDefaultWorkbenchSession();
    const stack = createWindowInstance("stack", "build", 7, 0, "saved-stack");
    const savedBook = {
      ...createWindowInstance("book", "field", 6, 0, "saved-book"),
      // Persisted titles remain visitor state even when the registry label evolves.
      title: "Book",
    };
    const session: WorkbenchSession = {
      ...seed,
      activeInstances: {
        ...seed.activeInstances,
        build: stack.instanceId,
        field: savedBook.instanceId,
      },
      windows: [...seed.windows, stack, savedBook],
    };

    expect(parseStrictWorkbenchSession(session)).toEqual(session);
  });

  it("compacts high z values into the window layer without changing order", () => {
    const now = createWindowInstance("now", "build", 80_000, 0, "high-now");
    const stack = createWindowInstance("stack", "build", 90_000, 0, "high-stack");
    const consoleWindow = createWindowInstance(
      "console",
      "build",
      100_000,
      0,
      "high-console",
    );
    const session: WorkbenchSession = {
      version: 3,
      activeWorkspaceId: "build",
      activeInstances: {
        build: consoleWindow.instanceId,
        field: null,
        notes: null,
      },
      themeId: "cobalt",
      windows: [now, stack, consoleWindow],
      scratch: "",
      methodStep: "clarify",
      updatedAt: Date.now(),
    };

    const parsed = parseStrictWorkbenchSession(session);

    expect(parsed?.windows.map((windowState) => windowState.z)).toEqual([1, 2, 3]);
    expect(parsed?.activeInstances.build).toBe(consoleWindow.instanceId);
    expect(session.windows.map((windowState) => windowState.z)).toEqual([
      80_000,
      90_000,
      100_000,
    ]);
  });

  it("preserves array stack order when compacting equal z values", () => {
    const first = {
      ...createWindowInstance("now", "build", 70, 0, "z-tied-first"),
      createdAt: 2,
    };
    const second = {
      ...createWindowInstance("stack", "build", 70, 0, "a-tied-second"),
      createdAt: 1,
    };
    const session: WorkbenchSession = {
      version: 3,
      activeWorkspaceId: "build",
      activeInstances: {
        build: second.instanceId,
        field: null,
        notes: null,
      },
      themeId: "cobalt",
      windows: [first, second],
      scratch: "",
      methodStep: "clarify",
      updatedAt: Date.now(),
    };

    const parsed = parseStrictWorkbenchSession(session);

    expect(parsed?.windows.map(({ instanceId, z }) => [instanceId, z])).toEqual([
      [first.instanceId, 1],
      [second.instanceId, 2],
    ]);
  });

  it("canonicalizes incomplete restore bounds while preserving 8K coordinates", () => {
    const maximizedBase = createWindowInstance(
      "now",
      "build",
      5,
      0,
      "maximized-8k",
    );
    const snappedBase = createWindowInstance(
      "stack",
      "build",
      6,
      0,
      "snapped-8k",
    );
    const maximized = {
      ...maximizedBase,
      x: 8_192,
      y: -8_192,
      maximized: true,
      restoreBounds: { x: 8_192 },
    };
    const snapped = {
      ...snappedBase,
      x: -8_192,
      y: 8_192,
      snap: "right",
      restoreBounds: { y: -8_192 },
    };
    const session = {
      version: 3,
      activeWorkspaceId: "build",
      activeInstances: {
        build: snapped.instanceId,
        field: null,
        notes: null,
      },
      themeId: "cobalt",
      windows: [maximized, snapped],
      scratch: "",
      methodStep: "clarify",
      updatedAt: Date.now(),
    };

    const parsed = parseStrictWorkbenchSession(session);

    expect(parsed?.windows[0]).toMatchObject({
      x: 8_192,
      y: -8_192,
      maximized: true,
      restoreBounds: {
        x: 8_192,
        y: maximizedBase.y,
        width: maximizedBase.width,
        height: maximizedBase.height,
      },
    });
    expect(parsed?.windows[1]).toMatchObject({
      x: -8_192,
      y: 8_192,
      snap: "right",
      restoreBounds: {
        x: snappedBase.x,
        y: -8_192,
        width: snappedBase.width,
        height: snappedBase.height,
      },
    });

    const outsideCoordinateLimit = {
      ...session,
      windows: [
        {
          ...maximized,
          x: WORKBENCH_COORDINATE_LIMIT + 1,
        },
        snapped,
      ],
    };
    expect(parseStrictWorkbenchSession(outsideCoordinateLimit)).toBeNull();
  });
});

describe("legacy workbench migration", () => {
  it("retains the historical multi-workspace baseline for scratch-only state", () => {
    const migrated = migrateLegacyWorkbenchSession(
      createStorage({
        [workbenchStorageKeys.legacyScratch]: "Scratch-only legacy state.",
      }),
    );

    expect(migrated?.windows).toHaveLength(8);
    const historicalWindows = [
      {
        instanceId: "build-now",
        appId: "now",
        title: "Now",
        workspaceId: "build",
        x: 24,
        y: 20,
        width: 395,
        height: 335,
        z: 3,
      },
      {
        instanceId: "build-stack",
        appId: "stack",
        title: "Stack",
        workspaceId: "build",
        x: 434,
        y: 20,
        width: 400,
        height: 355,
        z: 5,
      },
      {
        instanceId: "build-console",
        appId: "console",
        title: "Console",
        workspaceId: "build",
        x: 850,
        y: 400,
        width: 400,
        height: 205,
        z: 4,
      },
      {
        instanceId: "field-archive",
        appId: "archive",
        title: "Archive",
        workspaceId: "field",
        x: 260,
        y: 44,
        width: 760,
        height: 470,
        z: 3,
      },
      {
        instanceId: "field-vector",
        appId: "vector",
        title: "Vector",
        workspaceId: "field",
        x: 265,
        y: 48,
        width: 720,
        height: 450,
        z: 4,
      },
      {
        instanceId: "field-pulse",
        appId: "pulse",
        title: "Pulse",
        workspaceId: "field",
        x: 250,
        y: 40,
        width: 760,
        height: 460,
        z: 5,
      },
      {
        instanceId: "notes-archive",
        appId: "archive",
        title: "Archive",
        workspaceId: "notes",
        x: 260,
        y: 44,
        width: 760,
        height: 470,
        z: 3,
      },
      {
        instanceId: "notes-scratch",
        appId: "scratch",
        title: "Scratch",
        workspaceId: "notes",
        x: 434,
        y: 400,
        width: 395,
        height: 205,
        z: 4,
      },
    ] as const;
    for (const expectedWindow of historicalWindows) {
      expect(
        migrated?.windows.find(
          ({ instanceId }) => instanceId === expectedWindow.instanceId,
        ),
      ).toMatchObject(expectedWindow);
    }
    expect(migrated?.activeInstances).toEqual({
      build: "build-stack",
      field: "field-pulse",
      notes: "notes-scratch",
    });
    expect(migrated?.scratch).toBe("Scratch-only legacy state.");
    expect(
      migrated?.windows.find(({ instanceId }) => instanceId === "notes-scratch")
        ?.data,
    ).toEqual({ text: "Scratch-only legacy state." });
  });

  it("merges legacy windows into the historical baseline without dropping spaces", () => {
    const layout = JSON.stringify([
      {
        id: "now",
        x: 91,
        y: 42,
        width: 510,
        height: 430,
        z: 12,
        open: true,
        minimized: false,
        maximized: false,
      },
      {
        id: "scratch",
        x: 180,
        y: 110,
        width: 460,
        height: 300,
        z: 15,
        open: true,
        minimized: false,
        maximized: false,
      },
    ]);
    const migrated = migrateLegacyWorkbenchSession(
      createStorage({
        [workbenchStorageKeys.legacyLayout]: layout,
        [workbenchStorageKeys.legacyScratch]: "A preserved legacy note.",
      }),
    );

    expect(migrated).not.toBeNull();
    expect(migrated?.windows).toHaveLength(9);
    expect(migrated?.windows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instanceId: "build-now",
          x: 91,
          y: 42,
          width: 510,
          height: 430,
        }),
        expect.objectContaining({
          instanceId: "legacy-build-scratch",
          workspaceId: "build",
          data: { text: "A preserved legacy note." },
        }),
        expect.objectContaining({ instanceId: "field-archive" }),
        expect.objectContaining({ instanceId: "field-vector" }),
        expect.objectContaining({ instanceId: "field-pulse" }),
        expect.objectContaining({ instanceId: "notes-archive" }),
        expect.objectContaining({
          instanceId: "notes-scratch",
          data: { text: "A preserved legacy note." },
        }),
      ]),
    );
    expect(migrated?.activeInstances).toEqual({
      build: "legacy-build-scratch",
      field: "field-pulse",
      notes: "notes-scratch",
    });
    expect(migrated?.scratch).toBe("A preserved legacy note.");
  });

  it("uses frozen titles for every legacy app while preserving v1 geometry", () => {
    const legacyApps = [
      ["now", "Now"],
      ["stack", "Stack"],
      ["method", "Method"],
      ["scratch", "Scratch"],
      ["console", "Console"],
      ["links", "Links"],
      ["lab", "Subsurface"],
      ["vector", "Vector"],
    ] as const;
    const legacyWindows = legacyApps.map(([id], index) => ({
      id,
      x: 100 + index * 10,
      y: 80 + index * 8,
      width: 420 + index,
      height: 260 + index,
      z: 11 + index,
      open: true,
      minimized: false,
      maximized: id === "lab",
    }));
    const migrated = migrateLegacyWorkbenchSession(
      createStorage({
        [workbenchStorageKeys.legacyLayout]: JSON.stringify(legacyWindows),
        [workbenchStorageKeys.legacyScratch]: "All-app legacy scratch.",
      }),
    );

    expect(migrated?.windows).toHaveLength(13);
    for (const [id, title] of legacyApps) {
      const source = legacyWindows.find((windowState) => windowState.id === id);
      const migratedWindow = migrated?.windows.find(
        (windowState) =>
          windowState.workspaceId === "build" && windowState.appId === id,
      );
      expect(migratedWindow).toMatchObject({
        appId: id,
        title,
        x: source?.x,
        y: source?.y,
        width: source?.width,
        height: source?.height,
        z: source?.z,
        maximized: source?.maximized,
      });
      expect(migratedWindow?.instanceId).toBe(
        id === "now" || id === "stack" || id === "console"
          ? `build-${id}`
          : `legacy-build-${id}`,
      );
      if (source?.maximized) {
        expect(migratedWindow?.restoreBounds).toEqual({
          x: source.x,
          y: source.y,
          width: source.width,
          height: source.height,
        });
      }
    }
    expect(migrated?.activeInstances.build).toBe("legacy-build-vector");
    expect(
      migrated?.windows.find(
        ({ instanceId }) => instanceId === "legacy-build-scratch",
      )?.data,
    ).toEqual({ text: "All-app legacy scratch." });
  });
});
