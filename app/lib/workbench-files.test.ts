// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";

import {
  createDefaultWorkbenchFiles,
  createFolder,
  editNote,
  indexWorkbenchFiles,
  MAX_WORKBENCH_SEARCH_CACHE_ENTRIES,
  moveToTrash,
  parseWorkbenchFiles,
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

  it("reuses one indexed read model and memoized path per revision", () => {
    const files = createDefaultWorkbenchFiles();
    const index = indexWorkbenchFiles(files);
    const path = index.getNodePath("note-sam-field-note");

    expect(indexWorkbenchFiles(files)).toBe(index);
    expect(index.getNodePath("note-sam-field-note")).toBe(path);
    expect(path.map((node) => node.id)).toEqual([
      "archive-root",
      "folder-about",
      "note-sam-field-note",
    ]);
    expect(index.listChildren("folder-about").map((node) => node.id)).toEqual([
      "note-sam-field-note",
      "shortcut-book",
      "shortcut-now",
    ]);
  });

  it("indexes trash ancestry, search text, and note character totals", () => {
    const files = createDefaultWorkbenchFiles();
    const trashed = moveToTrash(files, "folder-about");
    const index = indexWorkbenchFiles(trashed);
    const expectedCharacterCount = trashed.nodes.reduce(
      (total, node) =>
        total + (node.kind === "note" ? node.content.length : 0),
      0,
    );

    expect(index.isNodeInTrash("note-sam-field-note")).toBe(true);
    expect(index.search("field note")).toHaveLength(0);
    expect(index.search("field note")).toBe(index.search("FIELD   NOTE"));
    expect(
      index
        .search("field note", { includeTrash: true })
        .map((node) => node.id),
    ).toContain("note-sam-field-note");
    expect(index.noteCharacterCount).toBe(expectedCharacterCount);
  });

  it("freezes filesystem snapshots and every exposed indexed collection", () => {
    const files = createDefaultWorkbenchFiles();
    const index = indexWorkbenchFiles(files);
    const children = index.listChildren("folder-about");
    const collections = [
      children,
      index.getNodePath("note-sam-field-note"),
      index.search("field note"),
      index.listChildren("missing-parent"),
      index.getNodePath("missing-node"),
      index.search("   "),
    ];

    expect(Object.isFrozen(files)).toBe(true);
    expect(Object.isFrozen(files.nodes)).toBe(true);
    expect(files.nodes.every((node) => Object.isFrozen(node))).toBe(true);
    expect(Object.isFrozen(index)).toBe(true);
    expect(collections.every((collection) => Object.isFrozen(collection))).toBe(
      true,
    );
    expect(() =>
      (children as unknown as unknown[]).pop(),
    ).toThrow(TypeError);
    expect(index.listChildren("folder-about")).toHaveLength(3);
    expect(Reflect.set(files.nodes[0]!, "name", "Changed")).toBe(false);

    const trashed = moveToTrash(files, "folder-about");
    const moved = trashed.nodes.find((node) => node.id === "folder-about");
    if (!moved || moved.kind === "root" || moved.kind === "trash") {
      throw new Error("expected a trashed folder");
    }
    expect(Object.isFrozen(trashed)).toBe(true);
    expect(Object.isFrozen(trashed.nodes)).toBe(true);
    expect(Object.isFrozen(moved)).toBe(true);
    expect(Object.isFrozen(moved.trashed)).toBe(true);
  });

  it("invalidates the index when an immutable filesystem revision changes", () => {
    const files = createDefaultWorkbenchFiles();
    const firstIndex = indexWorkbenchFiles(files);
    const next = editNote(
      files,
      "note-sam-field-note",
      "A revision-only search needle.",
    );
    const nextIndex = indexWorkbenchFiles(next);

    expect(next).not.toBe(files);
    expect(nextIndex).not.toBe(firstIndex);
    expect(firstIndex.search("revision-only")).toHaveLength(0);
    expect(nextIndex.search("revision-only").map((node) => node.id)).toEqual([
      "note-sam-field-note",
    ]);
    expect(nextIndex.noteCharacterCount).not.toBe(
      firstIndex.noteCharacterCount,
    );
  });

  it("uses an unambiguous cache key for search terms containing NUL", () => {
    const index = indexWorkbenchFiles(createDefaultWorkbenchFiles());

    expect(index.search("field\u0000note")).toHaveLength(0);
    expect(index.search("field note").map((node) => node.id)).toEqual([
      "note-sam-field-note",
    ]);
  });

  it("evicts the least-recently-used search result after the cache limit", () => {
    const index = indexWorkbenchFiles(createDefaultWorkbenchFiles());
    const firstResult = index.search("field note");

    for (
      let queryIndex = 0;
      queryIndex < MAX_WORKBENCH_SEARCH_CACHE_ENTRIES;
      queryIndex += 1
    ) {
      index.search(`eviction-miss-${queryIndex}`);
    }

    const refreshedResult = index.search("field note");
    expect(refreshedResult).not.toBe(firstResult);
    expect(refreshedResult.map((node) => node.id)).toEqual([
      "note-sam-field-note",
    ]);
  });

  it("migrates untouched legacy shortcut metadata while preserving v1", () => {
    const files = createDefaultWorkbenchFiles();
    const legacy = {
      version: files.version,
      nodes: files.nodes.map((node) => {
        if (node.id === "shortcut-book") {
          return {
            ...node,
            name: "Book",
            summary: "B2B scope estimator & consultation booking.",
          };
        }
        if (node.id === "shortcut-sandbox") {
          return {
            ...node,
            name: "Sandbox",
            summary: "Interactive systems teardown & case studies.",
          };
        }
        return { ...node };
      }),
    };

    const migrated = parseWorkbenchFiles(JSON.stringify(legacy));
    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(1);
    expect(
      migrated?.nodes.find((node) => node.id === "shortcut-book"),
    ).toMatchObject({
      name: "Brief",
      summary: "A factual project-enquiry brief composer.",
    });
    expect(
      migrated?.nodes.find((node) => node.id === "shortcut-sandbox"),
    ).toMatchObject({
      name: "Systems",
      summary: "Documented product systems and a motion simulation.",
    });
  });

  it("preserves custom shortcut names and skips conflicting legacy renames", () => {
    const files = createDefaultWorkbenchFiles();
    const timestamp = files.nodes[0]!.createdAt;
    const legacy = {
      version: files.version,
      nodes: [
        ...files.nodes.map((node) => {
          if (node.id === "shortcut-book") {
            return {
              ...node,
              name: "My project intake",
              summary: "B2B scope estimator & consultation booking.",
            };
          }
          if (node.id === "shortcut-sandbox") {
            return {
              ...node,
              name: "Sandbox",
              summary: "Interactive systems teardown & case studies.",
            };
          }
          return { ...node };
        }),
        {
          id: "note-user-systems",
          kind: "note",
          name: "Systems",
          parentId: "folder-systems",
          content: "User-authored sibling.",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    };

    const migrated = parseWorkbenchFiles(JSON.stringify(legacy));
    expect(migrated).not.toBeNull();
    expect(
      migrated?.nodes.find((node) => node.id === "shortcut-book"),
    ).toMatchObject({
      name: "My project intake",
      summary: "B2B scope estimator & consultation booking.",
    });
    expect(
      migrated?.nodes.find((node) => node.id === "shortcut-sandbox"),
    ).toMatchObject({ name: "Sandbox" });
    expect(validateWorkbenchFiles(migrated!)).not.toBeNull();
  });
});
