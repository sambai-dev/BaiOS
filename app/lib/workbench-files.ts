// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

export const WORKBENCH_FILES_VERSION = 1 as const;
export const WORKBENCH_FILES_STORAGE_KEY = "sam-workbench-files-v1";
export const ROOT_FILE_ID = "archive-root";
export const TRASH_FILE_ID = "archive-trash";

const DEFAULT_TIMESTAMP = "2026-08-14T00:00:00.000Z";
const NODE_KINDS = new Set(["root", "folder", "note", "app", "external", "trash"]);
export const MAX_ARCHIVE_BYTES = 1_048_576;
export const MAX_ARCHIVE_NODES = 2_000;
export const MAX_NOTE_LENGTH = 200_000;
export const MAX_ARCHIVE_DEPTH = 64;
export const MAX_WORKBENCH_SEARCH_CACHE_ENTRIES = 64;

type NodeKind = "root" | "folder" | "note" | "app" | "external" | "trash";

type BaseNode = {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly summary?: string;
};

export type RootNode = BaseNode & {
  readonly kind: "root";
  readonly parentId: null;
};

export type FolderNode = BaseNode & {
  readonly kind: "folder";
  readonly parentId: string;
  readonly trashed?: TrashMetadata;
};

export type NoteNode = BaseNode & {
  readonly kind: "note";
  readonly parentId: string;
  readonly content: string;
  readonly trashed?: TrashMetadata;
};

export type AppShortcutNode = BaseNode & {
  readonly kind: "app";
  readonly parentId: string;
  readonly appId: string;
  readonly trashed?: TrashMetadata;
};

export type ExternalLinkNode = BaseNode & {
  readonly kind: "external";
  readonly parentId: string;
  readonly href: string;
  readonly trashed?: TrashMetadata;
};

export type TrashNode = BaseNode & {
  readonly kind: "trash";
  readonly parentId: typeof ROOT_FILE_ID;
};

export type TrashMetadata = {
  readonly originalParentId: string;
  readonly deletedAt: string;
};

export type FileNode =
  | RootNode
  | FolderNode
  | NoteNode
  | AppShortcutNode
  | ExternalLinkNode
  | TrashNode;

export type WorkbenchFiles = {
  readonly version: typeof WORKBENCH_FILES_VERSION;
  readonly nodes: readonly FileNode[];
};

export type CreateNodeOptions = {
  readonly id?: string;
  readonly now?: string;
};

export type CreateNoteOptions = CreateNodeOptions & {
  readonly content?: string;
};

export type FileSearchOptions = {
  readonly includeTrash?: boolean;
};

export type WorkbenchFilesIndex = {
  readonly noteCharacterCount: number;
  readonly getNode: (id: string) => FileNode | undefined;
  readonly getNodePath: (id: string) => readonly FileNode[];
  readonly isNodeInTrash: (id: string) => boolean;
  readonly listChildren: (parentId: string) => readonly FileNode[];
  readonly search: (
    query: string,
    options?: FileSearchOptions,
  ) => readonly FileNode[];
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

type LegacyShortcutMetadataMigration = {
  readonly id: string;
  readonly appId: string;
  readonly legacyName: string;
  readonly legacySummary: string;
  readonly currentName: string;
  readonly currentSummary: string;
};

const LEGACY_SHORTCUT_METADATA_MIGRATIONS: readonly LegacyShortcutMetadataMigration[] =
  Object.freeze([
    Object.freeze({
      id: "shortcut-book",
      appId: "book",
      legacyName: "Book",
      legacySummary: "B2B scope estimator & consultation booking.",
      currentName: "Brief",
      currentSummary: "A factual project-enquiry brief composer.",
    }),
    Object.freeze({
      id: "shortcut-sandbox",
      appId: "sandbox",
      legacyName: "Sandbox",
      legacySummary: "Interactive systems teardown & case studies.",
      currentName: "Systems",
      currentSummary: "Documented product systems and a motion simulation.",
    }),
  ]);

function freezeFileNode(node: FileNode): FileNode {
  if (
    node.kind !== "root" &&
    node.kind !== "trash" &&
    node.trashed
  ) {
    Object.freeze(node.trashed);
  }
  return Object.freeze(node);
}

/** Enforces the immutable snapshot contract at runtime, not only in TypeScript. */
function freezeWorkbenchFiles(files: WorkbenchFiles): WorkbenchFiles {
  for (const node of files.nodes) freezeFileNode(node);
  Object.freeze(files.nodes);
  return Object.freeze(files);
}

const defaultNodes: readonly FileNode[] = [
  {
    id: ROOT_FILE_ID,
    kind: "root",
    name: "Sam's Archive",
    parentId: null,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "A local collection of working notes, systems, and experiments.",
  },
  {
    id: TRASH_FILE_ID,
    kind: "trash",
    name: "Trash",
    parentId: ROOT_FILE_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Items stay here until they are restored or deleted permanently.",
  },
  {
    id: "folder-about",
    kind: "folder",
    name: "About Sam",
    parentId: ROOT_FILE_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Builder, operator, and product consultant based in Hamilton.",
  },
  {
    id: "note-sam-field-note",
    kind: "note",
    name: "Field note",
    parentId: "folder-about",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "A compact operating note.",
    content:
      "I design and build software. I work across product decisions, interface design, and production engineering. The work matters when it helps a team make and act on the next decision.",
  },
  {
    id: "shortcut-now",
    kind: "app",
    name: "Open Now",
    parentId: "folder-about",
    appId: "now",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Jump to the current operating view.",
  },
  {
    id: "folder-solynth",
    kind: "folder",
    name: "Solynth Labs",
    parentId: ROOT_FILE_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Consulting practice for software direction and delivery.",
  },
  {
    id: "note-solynth-brief",
    kind: "note",
    name: "Engagement brief",
    parentId: "folder-solynth",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "How a useful consulting engagement starts.",
    content:
      "Start with the decision the business needs to make. Build the smallest useful version that can test it in real use. Solynth Labs can handle product direction, design, and engineering when splitting those jobs would slow the work down.",
  },
  {
    id: "link-solynth",
    kind: "external",
    name: "Visit Solynth Labs",
    parentId: "folder-solynth",
    href: "https://solynthlabs.com",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Open the company website in a new browser context.",
  },
  {
    id: "folder-trekky",
    kind: "folder",
    name: "Trekky.app",
    parentId: ROOT_FILE_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "The current product-building surface.",
  },
  {
    id: "note-trekky-product",
    kind: "note",
    name: "Product posture",
    parentId: "folder-trekky",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "A reminder about building the product in public reality.",
    content:
      "Watch where job-search planning breaks down. Fix that part, ship it, and see whether people use it. Trekky improves through releases and feedback from real use.",
  },
  {
    id: "link-trekky",
    kind: "external",
    name: "Open Trekky.app",
    parentId: "folder-trekky",
    href: "https://trekky.app",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Visit the product website.",
  },
  {
    id: "folder-method",
    kind: "folder",
    name: "Method",
    parentId: ROOT_FILE_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Clarify, shape, ship, and learn.",
  },
  {
    id: "note-method-loop",
    kind: "note",
    name: "The four-part loop",
    parentId: "folder-method",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "The operating method behind the workbench.",
    content:
      "CLARIFY: Name the decision behind the feature request.\n\nSHAPE: Define what the first useful version must do and how it can be built.\n\nSHIP: Put it in front of real users.\n\nLEARN: Use what happened to decide what to build next.",
  },
  {
    id: "shortcut-method",
    kind: "app",
    name: "Open Method",
    parentId: "folder-method",
    appId: "method",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Open the interactive method application.",
  },
  {
    id: "folder-systems",
    kind: "folder",
    name: "Systems",
    parentId: ROOT_FILE_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Interactive teardowns of real systems, captured as cases.",
  },
  {
    id: "folder-experiments",
    kind: "folder",
    name: "Experiments",
    parentId: ROOT_FILE_ID,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Small instruments for testing interaction ideas.",
  },
  {
    id: "note-experiment-rule",
    kind: "note",
    name: "Experiment rule",
    parentId: "folder-experiments",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Why these small tools exist.",
    content:
      "An experiment should expose a behavior, not decorate a screen. Give it a rule, a little resistance, and a result that changes when the visitor acts.",
  },
  {
    id: "shortcut-subsurface",
    kind: "app",
    name: "Subsurface",
    parentId: "folder-experiments",
    appId: "lab",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "A compact depth-control study.",
  },
  {
    id: "shortcut-vector",
    kind: "app",
    name: "Vector",
    parentId: "folder-experiments",
    appId: "vector",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "A spatial vector calculator and orbit study.",
  },
  {
    id: "shortcut-pulse",
    kind: "app",
    name: "Pulse",
    parentId: "folder-experiments",
    appId: "pulse",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "A CoinGecko-powered 24-hour crypto market monitor.",
  },
  {
    id: "shortcut-book",
    kind: "app",
    name: "Brief",
    parentId: "folder-about",
    appId: "book",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "A factual project-enquiry brief composer.",
  },
  {
    id: "shortcut-sandbox",
    kind: "app",
    name: "Systems",
    parentId: "folder-systems",
    appId: "sandbox",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "Documented product systems and a motion simulation.",
  },
  {
    id: "shortcut-agent",
    kind: "app",
    name: "Agent",
    parentId: "folder-experiments",
    appId: "agent",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    summary: "AI workflow orchestrator & prompt-to-UI terminal.",
  },
];

export const DEFAULT_WORKBENCH_FILES: WorkbenchFiles = freezeWorkbenchFiles({
  version: WORKBENCH_FILES_VERSION,
  nodes: defaultNodes,
});

function cloneFiles(files: WorkbenchFiles): WorkbenchFiles {
  return freezeWorkbenchFiles({
    version: WORKBENCH_FILES_VERSION,
    nodes: files.nodes.map((node) => ({
      ...node,
      ...(node.kind !== "root" &&
      node.kind !== "trash" &&
      node.trashed
        ? { trashed: { ...node.trashed } }
        : {}),
    })) as FileNode[],
  });
}

export function createDefaultWorkbenchFiles(): WorkbenchFiles {
  return cloneFiles(DEFAULT_WORKBENCH_FILES);
}

function cleanName(value: string, fallback: string) {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return cleaned || fallback;
}

function latestTimestamp(files: WorkbenchFiles) {
  // Compare instants numerically: string comparison only orders correctly
  // when every timestamp shares one canonical format, and validated input may
  // legitimately mix UTC ("Z") and offset ("-11:00") ISO forms.
  let latest = DEFAULT_TIMESTAMP;
  let latestMs = -Infinity;
  for (const node of files.nodes) {
    const ms = Date.parse(node.updatedAt);
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
      latest = node.updatedAt;
    }
  }
  return latest;
}

function buildAvailableId(files: WorkbenchFiles, kind: "folder" | "note", name: string) {
  const base = `${kind}-${cleanName(name, kind)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "untitled"}`;
  const ids = new Set(files.nodes.map((node) => node.id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function isContainer(node: FileNode | undefined): node is RootNode | FolderNode | TrashNode {
  return node?.kind === "root" || node?.kind === "folder" || node?.kind === "trash";
}

function uniqueSiblingName(
  files: WorkbenchFiles,
  parentId: string,
  requestedName: string,
  fallback: string,
  excludedId?: string,
) {
  const base = cleanName(requestedName, fallback);
  const siblingNames = new Set(
    files.nodes
      .filter((node) => node.parentId === parentId && node.id !== excludedId)
      .map((node) => node.name.toLocaleLowerCase("en")),
  );
  if (!siblingNames.has(base.toLocaleLowerCase("en"))) return base;
  let suffix = 2;
  while (siblingNames.has(`${base} ${suffix}`.toLocaleLowerCase("en"))) suffix += 1;
  return `${base} ${suffix}`;
}

function replaceNode(files: WorkbenchFiles, nextNode: FileNode): WorkbenchFiles {
  return {
    version: WORKBENCH_FILES_VERSION,
    nodes: files.nodes.map((node) => (node.id === nextNode.id ? nextNode : node)),
  };
}

/**
 * Keeps every locally-authored mutation inside the exact envelope accepted on
 * the next load. Returning the previous object gives callers a cheap rejection
 * signal without ever placing an unloadable filesystem in React state.
 */
function acceptFilesMutation(files: WorkbenchFiles, candidate: WorkbenchFiles) {
  return validateWorkbenchFiles(candidate) ?? files;
}

/**
 * Exact serialized footprint of an accepted filesystem, cached per object so
 * content-only edits can enforce the envelope incrementally instead of
 * re-serializing and re-parsing the whole archive on every keystroke.
 */
const fileSizeBudgets = new WeakMap<
  WorkbenchFiles,
  { chars: number; bytes: number }
>();

function measureSerializedFiles(
  files: WorkbenchFiles,
): { chars: number; bytes: number } | null {
  try {
    const serialized = JSON.stringify(files);
    return {
      chars: serialized.length,
      bytes: new TextEncoder().encode(serialized).byteLength,
    };
  } catch {
    return null;
  }
}

function fileSizeBudget(
  files: WorkbenchFiles,
): { chars: number; bytes: number } | null {
  const cached = fileSizeBudgets.get(files);
  if (cached) return cached;
  const measured = measureSerializedFiles(files);
  if (measured) fileSizeBudgets.set(files, measured);
  return measured;
}

export function getFileNode(files: WorkbenchFiles, id: string) {
  return indexWorkbenchFiles(files).getNode(id);
}

function isNodeInTrashFromIndex(
  byId: ReadonlyMap<string, FileNode>,
  id: string,
  memo?: Map<string, boolean>,
) {
  const memoized = memo?.get(id);
  if (memoized !== undefined) return memoized;

  const path: string[] = [];
  const visited = new Set<string>();
  let current = byId.get(id);
  let result = false;

  while (current?.parentId) {
    path.push(current.id);
    if (current.parentId === TRASH_FILE_ID) {
      result = true;
      break;
    }
    const inherited = memo?.get(current.parentId);
    if (inherited !== undefined) {
      result = inherited;
      break;
    }
    if (visited.has(current.parentId)) break;
    visited.add(current.parentId);
    current = byId.get(current.parentId);
  }

  memo?.set(id, result);
  for (const pathId of path) memo?.set(pathId, result);
  return result;
}

const EMPTY_FILE_NODES: readonly FileNode[] = Object.freeze([] as FileNode[]);
const workbenchFilesIndexCache = new WeakMap<
  WorkbenchFiles,
  WorkbenchFilesIndex
>();

/**
 * Builds the read model used by Archive views. One immutable filesystem
 * revision receives one index, so rendering a large folder does not rebuild
 * maps or walk the same ancestor chain for every row.
 */
export function indexWorkbenchFiles(files: WorkbenchFiles): WorkbenchFilesIndex {
  freezeWorkbenchFiles(files);
  const cached = workbenchFilesIndexCache.get(files);
  if (cached) return cached;

  const byId = new Map(files.nodes.map((node) => [node.id, node]));
  const childrenByParentId = new Map<string, FileNode[]>();
  const pathById = new Map<string, readonly FileNode[]>();
  const trashById = new Map<string, boolean>();
  const searchTextById = new Map<string, string>();
  const searchResultsByQuery = new Map<string, readonly FileNode[]>();
  let noteCharacterCount = 0;

  for (const node of files.nodes) {
    if (node.parentId) {
      const siblings = childrenByParentId.get(node.parentId);
      if (siblings) siblings.push(node);
      else childrenByParentId.set(node.parentId, [node]);
    }
    if (node.kind === "note") noteCharacterCount += node.content.length;
  }
  for (const siblings of childrenByParentId.values()) {
    siblings.sort(compareNodes);
    Object.freeze(siblings);
  }

  const getNodePath = (id: string): readonly FileNode[] => {
    const cachedPath = pathById.get(id);
    if (cachedPath) return cachedPath;

    const unresolved: FileNode[] = [];
    const visited = new Set<string>();
    let current = byId.get(id);
    let prefix: readonly FileNode[] = EMPTY_FILE_NODES;

    while (current && !visited.has(current.id)) {
      const ancestorPath = pathById.get(current.id);
      if (ancestorPath) {
        prefix = ancestorPath;
        break;
      }
      unresolved.push(current);
      visited.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }

    let resolvedPath = prefix;
    for (let index = unresolved.length - 1; index >= 0; index -= 1) {
      const node = unresolved[index];
      if (!node) continue;
      resolvedPath = Object.freeze([...resolvedPath, node]);
      pathById.set(node.id, resolvedPath);
    }
    return pathById.get(id) ?? EMPTY_FILE_NODES;
  };

  const isNodeInTrash = (id: string) =>
    isNodeInTrashFromIndex(byId, id, trashById);

  const search = (
    query: string,
    options: FileSearchOptions = {},
  ): readonly FileNode[] => {
    const includeTrash = options.includeTrash === true;
    const terms = query
      .trim()
      .toLocaleLowerCase("en")
      .split(/\s+/)
      .filter(Boolean);
    if (!terms.length) return EMPTY_FILE_NODES;

    const searchKey = JSON.stringify([includeTrash, terms]);
    const cachedResults = searchResultsByQuery.get(searchKey);
    if (cachedResults !== undefined) {
      // Refresh insertion order so the oldest unused query is evicted first.
      searchResultsByQuery.delete(searchKey);
      searchResultsByQuery.set(searchKey, cachedResults);
      return cachedResults;
    }

    const results = Object.freeze(
      files.nodes
        .filter((node) => {
          if (node.kind === "root" || node.kind === "trash") return false;
          if (!includeTrash && isNodeInTrash(node.id)) return false;

          let searchable = searchTextById.get(node.id);
          if (searchable === undefined) {
            searchable = [
              node.name,
              node.summary ?? "",
              node.kind === "note" ? node.content : "",
              node.kind === "app" ? node.appId : "",
              node.kind === "external" ? node.href : "",
            ]
              .join(" ")
              .toLocaleLowerCase("en");
            searchTextById.set(node.id, searchable);
          }
          return terms.every((term) => searchable.includes(term));
        })
        .sort(compareNodes),
    );
    searchResultsByQuery.set(searchKey, results);
    if (searchResultsByQuery.size > MAX_WORKBENCH_SEARCH_CACHE_ENTRIES) {
      const oldestKey = searchResultsByQuery.keys().next().value;
      if (oldestKey !== undefined) searchResultsByQuery.delete(oldestKey);
    }
    return results;
  };

  const index: WorkbenchFilesIndex = Object.freeze({
    noteCharacterCount,
    getNode: (id) => byId.get(id),
    getNodePath,
    isNodeInTrash,
    listChildren: (parentId) =>
      childrenByParentId.get(parentId) ?? EMPTY_FILE_NODES,
    search,
  });
  workbenchFilesIndexCache.set(files, index);
  return index;
}

export function createFolder(
  files: WorkbenchFiles,
  parentId: string,
  name: string,
  options: CreateNodeOptions = {},
): WorkbenchFiles {
  const parent = getFileNode(files, parentId);
  if (!isContainer(parent) || parent.kind === "trash") return files;
  const now = options.now ?? latestTimestamp(files);
  const node: FolderNode = {
    id: options.id ?? buildAvailableId(files, "folder", name),
    kind: "folder",
    name: uniqueSiblingName(files, parentId, name, "Untitled folder"),
    parentId,
    createdAt: now,
    updatedAt: now,
  };
  if (files.nodes.some((item) => item.id === node.id)) return files;
  return acceptFilesMutation(files, {
    version: WORKBENCH_FILES_VERSION,
    nodes: [...files.nodes, node],
  });
}

export function createNote(
  files: WorkbenchFiles,
  parentId: string,
  name: string,
  options: CreateNoteOptions = {},
): WorkbenchFiles {
  const parent = getFileNode(files, parentId);
  if (!isContainer(parent) || parent.kind === "trash") return files;
  const now = options.now ?? latestTimestamp(files);
  const node: NoteNode = {
    id: options.id ?? buildAvailableId(files, "note", name),
    kind: "note",
    name: uniqueSiblingName(files, parentId, name, "Untitled note"),
    parentId,
    content: options.content ?? "",
    createdAt: now,
    updatedAt: now,
  };
  if (files.nodes.some((item) => item.id === node.id)) return files;
  return acceptFilesMutation(files, {
    version: WORKBENCH_FILES_VERSION,
    nodes: [...files.nodes, node],
  });
}

export function renameNode(
  files: WorkbenchFiles,
  id: string,
  name: string,
  now = latestTimestamp(files),
): WorkbenchFiles {
  const node = getFileNode(files, id);
  if (!node || node.kind === "root" || node.kind === "trash" || !node.parentId) {
    return files;
  }
  const nextName = uniqueSiblingName(files, node.parentId, name, node.name, node.id);
  if (nextName === node.name) return files;
  return acceptFilesMutation(
    files,
    replaceNode(files, { ...node, name: nextName, updatedAt: now }),
  );
}

export function editNote(
  files: WorkbenchFiles,
  id: string,
  content: string,
  now = latestTimestamp(files),
): WorkbenchFiles {
  const node = getFileNode(files, id);
  if (!node || node.kind !== "note") return files;
  const nextContent = content.slice(0, MAX_NOTE_LENGTH);
  if (node.content === nextContent) return files;

  const nextNode: FileNode = { ...node, content: nextContent, updatedAt: now };

  // Fast path for typing: body edits cannot alter ids, parents, or the
  // hierarchy, so skip the full serialize-parse-validate cycle and enforce
  // the envelope incrementally from the previously measured footprint.
  // (A node's standalone serialization is byte-identical to its embedded
  // representation, so per-node deltas are exact.)
  const budget = fileSizeBudget(files);
  if (budget) {
    try {
      const previousSerialized = JSON.stringify(node);
      const nextSerialized = JSON.stringify(nextNode);
      const candidateChars =
        budget.chars - previousSerialized.length + nextSerialized.length;
      const candidateBytes =
        budget.bytes -
        new TextEncoder().encode(previousSerialized).byteLength +
        new TextEncoder().encode(nextSerialized).byteLength;
      if (
        candidateChars <= MAX_ARCHIVE_BYTES &&
        candidateBytes <= MAX_ARCHIVE_BYTES
      ) {
        const candidate = freezeWorkbenchFiles(replaceNode(files, nextNode));
        fileSizeBudgets.set(candidate, {
          chars: candidateChars,
          bytes: candidateBytes,
        });
        return candidate;
      }
    } catch {
      // Fall through to full validation below.
    }
  }

  return acceptFilesMutation(files, replaceNode(files, nextNode));
}

export function moveToTrash(
  files: WorkbenchFiles,
  id: string,
  now = latestTimestamp(files),
): WorkbenchFiles {
  const node = getFileNode(files, id);
  if (
    !node ||
    node.kind === "root" ||
    node.kind === "trash" ||
    !node.parentId ||
    isNodeInTrash(files, id)
  ) {
    return files;
  }
  return acceptFilesMutation(
    files,
    replaceNode(files, {
      ...node,
      parentId: TRASH_FILE_ID,
      updatedAt: now,
      trashed: { originalParentId: node.parentId, deletedAt: now },
    }),
  );
}

export function restoreFromTrash(
  files: WorkbenchFiles,
  id: string,
  now = latestTimestamp(files),
): WorkbenchFiles {
  const node = getFileNode(files, id);
  if (
    !node ||
    node.kind === "root" ||
    node.kind === "trash" ||
    node.parentId !== TRASH_FILE_ID ||
    !node.trashed
  ) {
    return files;
  }
  const originalParent = getFileNode(files, node.trashed.originalParentId);
  const parentId =
    isContainer(originalParent) && !isNodeInTrash(files, originalParent.id)
      ? originalParent.id
      : ROOT_FILE_ID;
  const { trashed: _trashed, ...restored } = node;
  void _trashed;
  return acceptFilesMutation(
    files,
    replaceNode(files, {
      ...restored,
      parentId,
      name: uniqueSiblingName(files, parentId, node.name, node.name, node.id),
      updatedAt: now,
    } as FileNode),
  );
}

function collectDescendantIds(files: WorkbenchFiles, id: string) {
  const descendants = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of files.nodes) {
      if (node.parentId && descendants.has(node.parentId) && !descendants.has(node.id)) {
        descendants.add(node.id);
        changed = true;
      }
    }
  }
  return descendants;
}

export function permanentlyDelete(files: WorkbenchFiles, id: string): WorkbenchFiles {
  const node = getFileNode(files, id);
  if (!node || node.kind === "root" || node.kind === "trash" || !isNodeInTrash(files, id)) {
    return files;
  }
  const deletedIds = collectDescendantIds(files, id);
  return acceptFilesMutation(files, {
    version: WORKBENCH_FILES_VERSION,
    nodes: files.nodes
      .filter((item) => !deletedIds.has(item.id))
      .map((item) => {
        if (
          item.kind !== "root" &&
          item.kind !== "trash" &&
          item.trashed &&
          deletedIds.has(item.trashed.originalParentId)
        ) {
          return {
            ...item,
            trashed: { ...item.trashed, originalParentId: ROOT_FILE_ID },
          };
        }
        return item;
      }),
  });
}

const kindOrder: Record<NodeKind, number> = {
  root: 0,
  folder: 1,
  note: 2,
  app: 3,
  external: 4,
  trash: 5,
};

function compareNodes(a: FileNode, b: FileNode) {
  const kindDifference = kindOrder[a.kind] - kindOrder[b.kind];
  if (kindDifference !== 0) return kindDifference;
  return a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" });
}

export function listChildren(files: WorkbenchFiles, parentId: string) {
  return indexWorkbenchFiles(files).listChildren(parentId);
}

export function isNodeInTrash(files: WorkbenchFiles, id: string) {
  return indexWorkbenchFiles(files).isNodeInTrash(id);
}

export function getNodePath(files: WorkbenchFiles, id: string) {
  return indexWorkbenchFiles(files).getNodePath(id);
}

export function searchFiles(
  files: WorkbenchFiles,
  query: string,
  options: FileSearchOptions = {},
) {
  return indexWorkbenchFiles(files).search(query, options);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTrashMetadata(value: unknown): TrashMetadata | undefined | null {
  if (value === undefined) return undefined;
  if (
    !isRecord(value) ||
    typeof value.originalParentId !== "string" ||
    value.originalParentId.length === 0 ||
    value.originalParentId.length > 160 ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value.originalParentId) ||
    typeof value.deletedAt !== "string" ||
    !Number.isFinite(Date.parse(value.deletedAt))
  ) {
    return null;
  }
  return { originalParentId: value.originalParentId, deletedAt: value.deletedAt };
}

function parseNode(value: unknown): FileNode | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    value.id.length > 160 ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value.id) ||
    typeof value.kind !== "string" ||
    !NODE_KINDS.has(value.kind) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    value.name.length > 240 ||
    /[\u0000-\u001f\u007f]/.test(value.name) ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    (value.parentId !== null &&
      (typeof value.parentId !== "string" ||
        value.parentId.length > 160 ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value.parentId))) ||
    (value.summary !== undefined &&
      (typeof value.summary !== "string" || value.summary.length > 2_000))
  ) {
    return null;
  }

  const base = {
    id: value.id,
    name: value.name,
    parentId: value.parentId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(typeof value.summary === "string" ? { summary: value.summary } : {}),
  };

  if (value.kind === "root") {
    return value.id === ROOT_FILE_ID && value.parentId === null
      ? ({ ...base, kind: "root", parentId: null } as RootNode)
      : null;
  }
  if (value.kind === "trash") {
    return value.id === TRASH_FILE_ID && value.parentId === ROOT_FILE_ID
      ? ({ ...base, kind: "trash", parentId: ROOT_FILE_ID } as TrashNode)
      : null;
  }
  if (typeof value.parentId !== "string") return null;
  const trashed = parseTrashMetadata(value.trashed);
  if (trashed === null) return null;
  const mutableBase = {
    ...base,
    parentId: value.parentId,
    ...(trashed ? { trashed } : {}),
  };
  if (value.kind === "folder") return { ...mutableBase, kind: "folder" };
  if (
    value.kind === "note" &&
    typeof value.content === "string" &&
    value.content.length <= MAX_NOTE_LENGTH
  ) {
    return { ...mutableBase, kind: "note", content: value.content };
  }
  if (
    value.kind === "app" &&
    typeof value.appId === "string" &&
    value.appId.length > 0 &&
    value.appId.length <= 120
  ) {
    return { ...mutableBase, kind: "app", appId: value.appId };
  }
  if (
    value.kind === "external" &&
    typeof value.href === "string" &&
    value.href.length <= 2_048
  ) {
    try {
      const url = new URL(value.href);
      if (url.protocol === "https:" || url.protocol === "mailto:") {
        return { ...mutableBase, kind: "external", href: value.href };
      }
    } catch {
      return null;
    }
  }
  return null;
}

function migrateLegacyShortcutMetadata(
  nodes: readonly FileNode[],
): readonly FileNode[] {
  // Shortcut names are user-editable. Upgrade only exact legacy metadata;
  // any changed copy or occupied target name is treated as user-owned state.
  let changed = false;
  const migrated = nodes.map((node) => {
    const migration = LEGACY_SHORTCUT_METADATA_MIGRATIONS.find(
      (candidate) => candidate.id === node.id,
    );
    if (
      !migration ||
      node.kind !== "app" ||
      node.appId !== migration.appId ||
      node.name !== migration.legacyName ||
      node.summary !== migration.legacySummary
    ) {
      return node;
    }

    const targetSiblingName = migration.currentName.toLocaleLowerCase("en");
    const hasSiblingConflict = nodes.some(
      (candidate) =>
        candidate.id !== node.id &&
        candidate.parentId === node.parentId &&
        candidate.name.toLocaleLowerCase("en") === targetSiblingName,
    );
    if (hasSiblingConflict) return node;

    changed = true;
    return {
      ...node,
      name: migration.currentName,
      summary: migration.currentSummary,
    };
  });
  return changed ? migrated : nodes;
}

function hasValidHierarchy(nodes: readonly FileNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const root = byId.get(ROOT_FILE_ID);
  const trash = byId.get(TRASH_FILE_ID);
  if (root?.kind !== "root" || trash?.kind !== "trash") return false;

  const siblingNames = new Set<string>();
  for (const node of nodes) {
    if (node.kind === "root") continue;
    if (!node.parentId) return false;
    const parent = byId.get(node.parentId);
    if (!isContainer(parent)) return false;
    const isDirectTrashChild = node.parentId === TRASH_FILE_ID;
    if (isDirectTrashChild !== Boolean(node.kind !== "trash" && node.trashed)) {
      return false;
    }
    if (node.parentId !== TRASH_FILE_ID) {
      const siblingKey = `${node.parentId}\u0000${node.name.toLocaleLowerCase("en")}`;
      if (siblingNames.has(siblingKey)) return false;
      siblingNames.add(siblingKey);
    }

    if (node.kind !== "trash" && node.trashed) {
      const originalParent = byId.get(node.trashed.originalParentId);
      if (!isContainer(originalParent) || originalParent.kind === "trash") return false;
    }

    const visited = new Set([node.id]);
    let current: FileNode | undefined = parent;
    let depth = 1;
    while (current?.parentId) {
      if (depth >= MAX_ARCHIVE_DEPTH) return false;
      if (visited.has(current.id)) return false;
      visited.add(current.id);
      current = byId.get(current.parentId);
      depth += 1;
    }
    if (current?.id !== ROOT_FILE_ID) return false;
  }
  return true;
}

export function parseWorkbenchFiles(serialized: string | null | undefined) {
  if (
    !serialized ||
    serialized.length > MAX_ARCHIVE_BYTES ||
    new TextEncoder().encode(serialized).byteLength > MAX_ARCHIVE_BYTES
  ) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      value.version !== WORKBENCH_FILES_VERSION ||
      !Array.isArray(value.nodes) ||
      value.nodes.length > MAX_ARCHIVE_NODES
    ) {
      return null;
    }
    const nodes: FileNode[] = [];
    const ids = new Set<string>();
    for (const candidate of value.nodes) {
      const node = parseNode(candidate);
      if (!node || ids.has(node.id)) return null;
      ids.add(node.id);
      nodes.push(node);
    }
    if (!hasValidHierarchy(nodes)) return null;
    const migratedNodes = migrateLegacyShortcutMetadata(nodes);
    if (!hasValidHierarchy(migratedNodes)) return null;
    let parsed: WorkbenchFiles = {
      version: WORKBENCH_FILES_VERSION,
      nodes: migratedNodes,
    };
    let measured = measureSerializedFiles(parsed);
    if (
      migratedNodes !== nodes &&
      (!measured ||
        measured.chars > MAX_ARCHIVE_BYTES ||
        measured.bytes > MAX_ARCHIVE_BYTES)
    ) {
      // A metadata upgrade must never make a formerly valid, full archive
      // unloadable. Keep the v1 legacy strings when there is no byte headroom.
      parsed = { version: WORKBENCH_FILES_VERSION, nodes };
      measured = measureSerializedFiles(parsed);
    }
    if (
      !measured ||
      measured.chars > MAX_ARCHIVE_BYTES ||
      measured.bytes > MAX_ARCHIVE_BYTES
    ) {
      return null;
    }
    parsed = freezeWorkbenchFiles(parsed);
    // Seed the incremental size budget used by content-only edit fast paths.
    fileSizeBudgets.set(parsed, measured);
    return parsed;
  } catch {
    return null;
  }
}

/** Returns a canonical copy when the complete filesystem is safe to persist. */
export function validateWorkbenchFiles(files: WorkbenchFiles) {
  try {
    return parseWorkbenchFiles(JSON.stringify(files));
  } catch {
    return null;
  }
}

export function serializeWorkbenchFiles(files: WorkbenchFiles) {
  return JSON.stringify(files);
}

export function loadWorkbenchFiles(
  storage: StorageReader | null | undefined,
  key = WORKBENCH_FILES_STORAGE_KEY,
) {
  if (!storage) return createDefaultWorkbenchFiles();
  try {
    return parseWorkbenchFiles(storage.getItem(key)) ?? createDefaultWorkbenchFiles();
  } catch {
    return createDefaultWorkbenchFiles();
  }
}

export function saveWorkbenchFiles(
  storage: StorageWriter | null | undefined,
  files: WorkbenchFiles,
  key = WORKBENCH_FILES_STORAGE_KEY,
) {
  if (!storage) return false;
  try {
    storage.setItem(key, serializeWorkbenchFiles(files));
    return true;
  } catch {
    return false;
  }
}
