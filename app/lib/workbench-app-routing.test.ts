// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";
import { parseStrictWorkbenchSession } from "./workbench-backup";
import {
  createDefaultWorkbenchSession,
  createWindowInstance,
  workbenchApps,
  type WorkbenchSession,
} from "./workbench-system";
import {
  getWorkbenchSessionUrl,
  openWorkbenchApplication,
  organizeWorkbenchSession,
} from "./workbench-app-routing";

describe("workspace app organization", () => {
  it("uses the same three categories for professional work, experiments, and personal tools", () => {
    const appsIn = (workspaceId: string) => workbenchApps
      .filter((app) => app.defaultWorkspaceId === workspaceId)
      .map((app) => app.id);
    expect(appsIn("build")).toEqual(["now", "stack", "method", "links", "book", "sandbox"]);
    expect(appsIn("field")).toEqual(["pulse", "lab", "railshift", "vector"]);
    expect(appsIn("notes")).toEqual(["scratch", "console", "agent", "archive", "search", "control"]);
  });

  it("moves a saved game out of Notes while preserving IDs, drafts, window state, and active focus", () => {
    const initial = createDefaultWorkbenchSession();
    const game = createWindowInstance("railshift", "notes", 8, 0, "notes-old-game");
    const note = {
      ...createWindowInstance("scratch", "build", 6, 0, "work-old-note"),
      title: "My project notes",
      data: { text: "Keep this draft exactly as written." },
      minimized: true,
      x: 133,
      y: 87,
    };
    const legacy: WorkbenchSession = {
      ...initial,
      activeWorkspaceId: "notes",
      activeInstances: { build: "build-now", field: null, notes: game.instanceId },
      windows: [...initial.windows, note, game],
      scratch: "Legacy note content",
    };

    const organized = organizeWorkbenchSession(legacy);
    expect(organized.activeWorkspaceId).toBe("field");
    expect(organized.activeInstances).toEqual({
      build: "build-now", field: game.instanceId, notes: null,
    });
    expect(organized.windows.find((item) => item.instanceId === game.instanceId)).toEqual({
      ...game, workspaceId: "field",
    });
    expect(organized.windows.find((item) => item.instanceId === note.instanceId)).toEqual({
      ...note, workspaceId: "notes",
    });
    expect(organized.scratch).toBe(legacy.scratch);
    expect(legacy.windows.at(-1)?.workspaceId).toBe("notes");
    expect(parseStrictWorkbenchSession(organized)).toEqual(organized);
    expect(organizeWorkbenchSession(organized)).toBe(organized);
  });

  it("keeps the chosen empty workspace when there is no active window to follow", () => {
    const initial = createDefaultWorkbenchSession();
    const game = createWindowInstance("lab", "build", 4, 0, "old-submarine");
    const organized = organizeWorkbenchSession({
      ...initial,
      activeWorkspaceId: "notes",
      windows: [...initial.windows, game],
    });
    expect(organized.activeWorkspaceId).toBe("notes");
    expect(organized.activeInstances.field).toBe(game.instanceId);
    expect(organized.activeInstances.notes).toBeNull();
  });
});

describe("app workspace routing", () => {
  it("launches a game from Notes in Playground and reuses its misplaced saved instance", () => {
    const initial = createDefaultWorkbenchSession();
    const game = {
      ...createWindowInstance("railshift", "notes", 7, 0, "saved-railshift"),
      open: false,
      data: { preserved: "window data" },
    };
    const opened = openWorkbenchApplication({
      ...initial,
      activeWorkspaceId: "notes",
      windows: [...initial.windows, game],
    }, "railshift");

    expect(opened.activeInstanceId).toBe(game.instanceId);
    expect(opened.session.activeWorkspaceId).toBe("field");
    expect(opened.session.activeInstances.field).toBe(game.instanceId);
    expect(opened.windows).toHaveLength(2);
    expect(opened.windows.find((item) => item.instanceId === game.instanceId)).toMatchObject({
      workspaceId: "field", open: true, minimized: false, data: game.data,
    });
    expect(parseStrictWorkbenchSession(opened.session)).toEqual(opened.session);
  });

  it("routes Files to Notes and writes both resolved URL parameters while retaining unrelated URL data", () => {
    const initial = createDefaultWorkbenchSession();
    const opened = openWorkbenchApplication({ ...initial, activeWorkspaceId: "field" }, "archive");
    const url = new URL(getWorkbenchSessionUrl(
      "http://localhost:3000/?workspace=field&app=railshift&utm_source=test#details",
      opened.session,
    ));
    expect(opened.session.activeWorkspaceId).toBe("notes");
    expect(url.searchParams.get("workspace")).toBe("notes");
    expect(url.searchParams.get("app")).toBe("archive");
    expect(url.searchParams.get("utm_source")).toBe("test");
    expect(url.hash).toBe("#details");
  });

  it("creates extra notes only on request and preserves each existing draft", () => {
    const initial = createDefaultWorkbenchSession();
    const original = {
      ...createWindowInstance("scratch", "build", 3, 0, "first-note"),
      data: { text: "An existing draft." },
    };
    const opened = openWorkbenchApplication({
      ...initial, windows: [...initial.windows, original],
    }, "scratch", { forceNew: true, instanceId: "second-note" });
    expect(opened.session.activeWorkspaceId).toBe("notes");
    expect(opened.activeInstanceId).toBe("second-note");
    expect(opened.windows.filter((item) => item.appId === "scratch")).toHaveLength(2);
    expect(opened.windows.find((item) => item.instanceId === "first-note")).toMatchObject({
      workspaceId: "notes", data: original.data,
    });
  });

  it("clears the app URL when switching to an empty workspace", () => {
    const session = { ...createDefaultWorkbenchSession(), activeWorkspaceId: "notes" as const };
    const url = new URL(getWorkbenchSessionUrl("http://localhost:3000/?app=now", session));
    expect(url.searchParams.get("workspace")).toBe("notes");
    expect(url.searchParams.has("app")).toBe(false);
  });
});
