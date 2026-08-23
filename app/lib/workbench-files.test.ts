import { describe, expect, it } from "vitest";

import {
  createDefaultWorkbenchFiles,
  createFolder,
  moveToTrash,
  validateWorkbenchFiles,
} from "./workbench-files";

describe("workbench files defaults", () => {
  it("passes validation", () => {
    const files = createDefaultWorkbenchFiles();
    expect(validateWorkbenchFiles(files)).not.toBeNull();
  });

  it("supports creating a folder", () => {
    const files = createDefaultWorkbenchFiles();
    const next = createFolder(files, "archive-root", "New folder");
    expect(next).not.toBe(files);
    expect(next.nodes.length).toBe(files.nodes.length + 1);
    expect(validateWorkbenchFiles(next)).not.toBeNull();
  });

  it("supports moving a node to trash", () => {
    const files = createDefaultWorkbenchFiles();
    const next = moveToTrash(files, "folder-about");
    expect(next).not.toBe(files);
    const moved = next.nodes.find((node) => node.id === "folder-about");
    if (!moved || moved.kind === "root" || moved.kind === "trash") {
      throw new Error("expected node to exist after moveToTrash");
    }
    expect(moved.trashed).toBeDefined();
    expect(validateWorkbenchFiles(next)).not.toBeNull();
  });
});
