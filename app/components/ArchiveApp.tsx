// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ROOT_FILE_ID,
  TRASH_FILE_ID,
  type FileNode,
  type WorkbenchFiles,
  createFolder,
  createNote,
  editNote,
  indexWorkbenchFiles,
  moveToTrash,
  permanentlyDelete,
  renameNode,
  restoreFromTrash,
} from "../lib/workbench-files";
import "../styles/archive-app.css";

export type ArchiveAppProps = {
  files: WorkbenchFiles;
  currentFolderId: string;
  onFolderChange: (folderId: string) => void;
  onFilesChange: (files: WorkbenchFiles) => void;
  onOpenApp: (appId: string) => void;
  onOpenExternal: (href: string) => void;
  onMutationRejected?: (message: string) => void;
};

type ViewMode = "list" | "grid";
type CreationMode = "note" | "folder";

const locationIds = [
  ROOT_FILE_ID,
  "folder-about",
  "folder-solynth",
  "folder-trekky",
  "folder-method",
  "folder-experiments",
  TRASH_FILE_ID,
] as const;

const archiveLimitMessage =
  "Archive is at its safe local limit. Delete an item or shorten a note before adding more.";
const ARCHIVE_RENDER_BATCH = 200;

function isContainer(node: FileNode | undefined) {
  return node?.kind === "root" || node?.kind === "folder" || node?.kind === "trash";
}

function kindLabel(kind: FileNode["kind"]) {
  if (kind === "app") return "Application";
  if (kind === "external") return "External link";
  if (kind === "root") return "Volume";
  return `${kind.slice(0, 1).toUpperCase()}${kind.slice(1)}`;
}

function normalizeRenameValue(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

// Stored timestamps are UTC ISO strings; display them in the NZ timezone
// the rest of the OS is branded around, not as raw UTC calendar days.
const archiveDateFormat = new Intl.DateTimeFormat("en-NZ", {
  timeZone: "Pacific/Auckland",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const archiveCompactNumberFormat = new Intl.NumberFormat("en-NZ", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Local session";
  return archiveDateFormat.format(parsed);
}

function makeLocalId(kind: CreationMode) {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ? `local-${kind}-${randomId}` : `local-${kind}-${Date.now().toString(36)}`;
}

export default function ArchiveApp({
  files,
  currentFolderId,
  onFolderChange,
  onFilesChange,
  onOpenApp,
  onOpenExternal,
  onMutationRejected,
}: ArchiveAppProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [creationMode, setCreationMode] = useState<CreationMode | null>(null);
  const [creationName, setCreationName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renderedItemLimit, setRenderedItemLimit] = useState(
    ARCHIVE_RENDER_BATCH,
  );
  const [folderFocusRequest, setFolderFocusRequest] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteReturnFocusRef = useRef<HTMLElement | null>(null);
  const confirmDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const keepDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFolderFocusRef = useRef<string | null>(null);
  const pendingRemovalFocusIndexRef = useRef<number | null>(null);
  const pendingProgressiveFocusIndexRef = useRef<number | null>(null);
  // Latches the archive-limit notice so a rejected keystroke stream reports
  // once instead of pushing an aria-live message on every keypress.
  const rejectionNoticeLatchedRef = useRef(false);
  const searchId = useId();
  const creationId = useId();
  const noteEditorId = useId();
  const renameInputId = useId();
  const deleteDialogTitleId = useId();
  const deleteDialogDescriptionId = useId();

  const fileIndex = indexWorkbenchFiles(files);
  const requestedFolder = fileIndex.getNode(currentFolderId);
  const currentFolder = isContainer(requestedFolder)
    ? requestedFolder
    : fileIndex.getNode(ROOT_FILE_ID);
  const resolvedFolderId = currentFolder?.id ?? ROOT_FILE_ID;
  const isTrashView =
    resolvedFolderId === TRASH_FILE_ID ||
    fileIndex.isNodeInTrash(resolvedFolderId);
  const normalizedQuery = query.trim();

  const displayItems = (() => {
    if (!normalizedQuery) return fileIndex.listChildren(resolvedFolderId);
    const results = fileIndex.search(normalizedQuery, {
      includeTrash: isTrashView,
    });
    return isTrashView
      ? results.filter((node) => fileIndex.isNodeInTrash(node.id))
      : results;
  })();

  const renderedItems = displayItems.slice(0, renderedItemLimit);
  const renderedItemIds = new Set(renderedItems.map((node) => node.id));
  const renderedItemIndex = new Map(
    renderedItems.map((node, index) => [node.id, index]),
  );
  const renderedItemCount = renderedItems.length;
  const hasMoreItems = renderedItems.length < displayItems.length;

  const selectedNode = selectedId
    ? fileIndex.getNode(selectedId)
    : undefined;
  const deleteTargetNode = confirmDeleteId
    ? fileIndex.getNode(confirmDeleteId)
    : undefined;
  const isDeleteDialogOpen = Boolean(deleteTargetNode);
  const selectedIsTrashed = selectedNode
    ? fileIndex.isNodeInTrash(selectedNode.id)
    : false;
  const selectedCanRestore = Boolean(
    selectedNode &&
      selectedNode.kind !== "root" &&
      selectedNode.kind !== "trash" &&
      selectedNode.parentId === TRASH_FILE_ID &&
      selectedNode.trashed,
  );
  const breadcrumb = currentFolder
    ? fileIndex.getNodePath(currentFolder.id)
    : [];
  const locations = locationIds
    .map((id) => fileIndex.getNode(id))
    .filter((node): node is FileNode => Boolean(node));
  const canCreate =
    !isTrashView && (currentFolder?.kind === "root" || currentFolder?.kind === "folder");

  const commitFilesMutation = (
    nextFiles: WorkbenchFiles,
    reportRejection = true,
  ) => {
    if (nextFiles === files) {
      if (reportRejection && !rejectionNoticeLatchedRef.current) {
        rejectionNoticeLatchedRef.current = true;
        onMutationRejected?.(archiveLimitMessage);
      }
      return false;
    }
    rejectionNoticeLatchedRef.current = false;
    onFilesChange(nextFiles);
    return true;
  };

  const commitRemovalMutation = (
    nextFiles: WorkbenchFiles,
    removedNodeId: string,
  ) => {
    const removedIndex = renderedItemIndex.get(removedNodeId) ?? 0;
    pendingRemovalFocusIndexRef.current = Math.max(0, removedIndex);
    if (!commitFilesMutation(nextFiles)) {
      pendingRemovalFocusIndexRef.current = null;
      return false;
    }
    setSelectedId(null);
    return true;
  };

  useEffect(() => {
    if (!isDeleteDialogOpen) return;
    const frame = window.requestAnimationFrame(() => {
      keepDeleteButtonRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isDeleteDialogOpen]);

  useEffect(() => {
    const requestedIndex = pendingProgressiveFocusIndexRef.current;
    if (requestedIndex === null || requestedIndex >= renderedItemCount) return;
    pendingProgressiveFocusIndexRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      const requestedItem = itemRefs.current[requestedIndex];
      if (!requestedItem?.isConnected) return;
      const nodeId = requestedItem.dataset.archiveNodeId;
      if (nodeId) setSelectedId(nodeId);
      requestedItem.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [renderedItemCount]);

  // Re-arm the rejection notice when the user works on a different item.
  useEffect(() => {
    rejectionNoticeLatchedRef.current = false;
  }, [selectedId]);

  useEffect(() => {
    if (pendingFolderFocusRef.current !== resolvedFolderId) return;
    pendingFolderFocusRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      const firstItem = itemRefs.current[0];
      if (firstItem?.isConnected) {
        const nodeId = firstItem.dataset.archiveNodeId;
        if (nodeId) setSelectedId(nodeId);
        firstItem.focus({ preventScroll: true });
        return;
      }
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [folderFocusRequest, resolvedFolderId]);

  useEffect(() => {
    const requestedIndex = pendingRemovalFocusIndexRef.current;
    if (requestedIndex === null) return;
    pendingRemovalFocusIndexRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      const survivingItems = itemRefs.current.filter(
        (item): item is HTMLButtonElement => Boolean(item?.isConnected),
      );
      const adjacentItem =
        survivingItems[
          Math.min(requestedIndex, Math.max(0, survivingItems.length - 1))
        ];
      if (adjacentItem) {
        const nodeId = adjacentItem.dataset.archiveNodeId;
        if (nodeId) setSelectedId(nodeId);
        adjacentItem.focus({ preventScroll: true });
        return;
      }
      setSelectedId(null);
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [files]);

  const navigateTo = (folderId: string) => {
    const target = fileIndex.getNode(folderId);
    if (!isContainer(target)) return;
    pendingFolderFocusRef.current = folderId;
    setFolderFocusRequest((request) => request + 1);
    setSelectedId(null);
    setConfirmDeleteId(null);
    setRenameId(null);
    setQuery("");
    pendingProgressiveFocusIndexRef.current = null;
    setRenderedItemLimit(ARCHIVE_RENDER_BATCH);
    onFolderChange(folderId);
  };

  const openNode = (node: FileNode) => {
    if (node.kind === "root" || node.kind === "folder" || node.kind === "trash") {
      navigateTo(node.id);
    } else if (node.kind === "app") {
      onOpenApp(node.appId);
    } else if (node.kind === "external") {
      onOpenExternal(node.href);
    }
  };

  const focusItem = (index: number) => {
    const safeIndex = Math.max(0, Math.min(renderedItems.length - 1, index));
    const node = renderedItems[safeIndex];
    if (!node) return;
    setSelectedId(node.id);
    itemRefs.current[safeIndex]?.focus();
  };

  const revealAndFocusItem = (index: number, requestedLimit: number) => {
    const safeIndex = Math.max(0, Math.min(displayItems.length - 1, index));
    if (safeIndex < renderedItems.length) {
      focusItem(safeIndex);
      return;
    }
    pendingProgressiveFocusIndexRef.current = safeIndex;
    setRenderedItemLimit(
      Math.min(
        displayItems.length,
        Math.max(renderedItemLimit, requestedLimit, safeIndex + 1),
      ),
    );
  };

  const beginDeleteConfirmation = (nodeId: string) => {
    const returnTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    deleteReturnFocusRef.current = returnTarget;
    // Move focus out before the next render makes the surrounding surface
    // inert and aria-hidden; Chrome otherwise rejects hiding a focused child.
    returnTarget?.blur();
    setConfirmDeleteId(nodeId);
  };

  const cancelDeleteConfirmation = () => {
    const returnTarget = deleteReturnFocusRef.current;
    deleteReturnFocusRef.current = null;
    setConfirmDeleteId(null);
    window.requestAnimationFrame(() => {
      if (returnTarget?.isConnected) {
        returnTarget.focus({ preventScroll: true });
        return;
      }
      const selectedIndex = selectedId
        ? renderedItemIndex.get(selectedId) ?? -1
        : -1;
      const fallbackItem =
        selectedIndex >= 0 ? itemRefs.current[selectedIndex] : null;
      (fallbackItem ?? searchInputRef.current)?.focus({ preventScroll: true });
    });
  };

  const handleDeleteDialogKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelDeleteConfirmation();
      return;
    }
    if (event.key !== "Tab") return;

    const firstControl = confirmDeleteButtonRef.current;
    const lastControl = keepDeleteButtonRef.current;
    if (!firstControl || !lastControl) {
      event.preventDefault();
      deleteDialogRef.current?.focus({ preventScroll: true });
      return;
    }

    const activeElement = document.activeElement;
    const focusIsOutsideDialog = !deleteDialogRef.current?.contains(activeElement);
    if (event.shiftKey && (activeElement === firstControl || focusIsOutsideDialog)) {
      event.preventDefault();
      lastControl.focus();
    } else if (
      !event.shiftKey &&
      (activeElement === lastControl || focusIsOutsideDialog)
    ) {
      event.preventDefault();
      firstControl.focus();
    }
  };

  const handleItemKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    node: FileNode,
    index: number,
  ) => {
    let nextIndex = index;
    let nextRenderedLimit = renderedItemLimit;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = Math.min(displayItems.length - 1, index + 1);
      if (nextIndex >= renderedItems.length) {
        nextRenderedLimit = Math.min(
          displayItems.length,
          renderedItemLimit + ARCHIVE_RENDER_BATCH,
        );
      }
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = Math.max(0, index - 1);
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = displayItems.length - 1;
      nextRenderedLimit = displayItems.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      openNode(node);
      return;
    } else if (event.key === "F2" && node.kind !== "root" && node.kind !== "trash") {
      event.preventDefault();
      setRenameId(node.id);
      setRenameValue(node.name);
      return;
    } else if (event.key === "Delete" && node.kind !== "root" && node.kind !== "trash") {
      event.preventDefault();
      if (fileIndex.isNodeInTrash(node.id)) beginDeleteConfirmation(node.id);
      else {
        commitRemovalMutation(
          moveToTrash(files, node.id, new Date().toISOString()),
          node.id,
        );
      }
      return;
    } else {
      return;
    }
    event.preventDefault();
    revealAndFocusItem(nextIndex, nextRenderedLimit);
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creationMode || !canCreate || !creationName.trim()) return;
    const now = new Date().toISOString();
    const id = makeLocalId(creationMode);
    const nextFiles =
      creationMode === "folder"
        ? createFolder(files, resolvedFolderId, creationName, { id, now })
        : createNote(files, resolvedFolderId, creationName, { id, now });
    if (commitFilesMutation(nextFiles)) {
      setSelectedId(id);
      // Only a successful create dismisses the form; a rejected mutation
      // (archive envelope full) keeps the typed name for a retry.
      setCreationMode(null);
      setCreationName("");
    }
  };

  const beginRename = (node: FileNode) => {
    if (node.kind === "root" || node.kind === "trash") return;
    setRenameId(node.id);
    setRenameValue(node.name);
  };

  const handleRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNode || selectedNode.id !== renameId) return;
    const normalizedName = normalizeRenameValue(renameValue);
    if (!normalizedName) return;
    if (normalizedName === selectedNode.name) {
      setRenameId(null);
      setRenameValue("");
      return;
    }
    const renamedFiles = renameNode(
      files,
      selectedNode.id,
      renameValue,
      new Date().toISOString(),
    );
    if (!commitFilesMutation(renamedFiles)) return;
    setRenameId(null);
    setRenameValue("");
  };

  const showNextItems = () => {
    const firstNewItemIndex = renderedItems.length;
    const nextLimit = Math.min(
      displayItems.length,
      renderedItemLimit + ARCHIVE_RENDER_BATCH,
    );
    pendingProgressiveFocusIndexRef.current = firstNewItemIndex;
    setRenderedItemLimit(nextLimit);
  };

  const moveSelectedToTrash = () => {
    if (!selectedNode) return;
    commitRemovalMutation(
      moveToTrash(files, selectedNode.id, new Date().toISOString()),
      selectedNode.id,
    );
  };

  const restoreSelected = () => {
    if (!selectedNode) return;
    // Reuse the removal-focus flow: after the item leaves the trash list,
    // keyboard focus lands on the adjacent row instead of dropping to <body>.
    const restoredIndex = renderedItemIndex.get(selectedNode.id) ?? 0;
    pendingRemovalFocusIndexRef.current = Math.max(0, restoredIndex);
    if (
      !commitFilesMutation(
        restoreFromTrash(files, selectedNode.id, new Date().toISOString()),
      )
    ) {
      pendingRemovalFocusIndexRef.current = null;
      return;
    }
    setSelectedId(null);
  };

  const deleteSelectedForever = () => {
    if (!deleteTargetNode || confirmDeleteId !== deleteTargetNode.id) return;
    if (
      !commitRemovalMutation(
        permanentlyDelete(files, deleteTargetNode.id),
        deleteTargetNode.id,
      )
    ) {
      return;
    }
    setConfirmDeleteId(null);
    deleteReturnFocusRef.current = null;
  };

  return (
    <div className="archive-app">
      <div
        className="archive-surface"
        aria-hidden={isDeleteDialogOpen ? true : undefined}
        inert={isDeleteDialogOpen ? true : undefined}
      >
        <header className="archive-titlebar">
        <div>
          <span>Local volume / 01</span>
          <strong>Archive</strong>
        </div>
        <label className="archive-search" htmlFor={searchId}>
          <span>Search</span>
          <input
            ref={searchInputRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedId(null);
              pendingProgressiveFocusIndexRef.current = null;
              setRenderedItemLimit(ARCHIVE_RENDER_BATCH);
            }}
            placeholder="Files, notes, systems"
            autoComplete="off"
          />
        </label>
        </header>

      <div className="archive-shell">
        <aside className="archive-locations" aria-label="Archive locations">
          <span className="archive-section-label">Locations</span>
          <nav>
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                className={location.id === resolvedFolderId ? "is-current" : ""}
                aria-current={location.id === resolvedFolderId ? "page" : undefined}
                onClick={() => navigateTo(location.id)}
              >
                <span className="archive-node-mark" data-kind={location.kind} aria-hidden="true" />
                <span>{location.kind === "root" ? "Archive" : location.name}</span>
              </button>
            ))}
          </nav>
          <dl className="archive-volume-readout">
            <div><dt>Mode</dt><dd>Local</dd></div>
            <div><dt>Items</dt><dd>{files.nodes.length - 2}</dd></div>
          </dl>
        </aside>

        <section className="archive-browser" aria-label="Archive browser">
          <div className="archive-browser-head">
            <nav className="archive-breadcrumb" aria-label="Current folder path">
              {breadcrumb.map((node, index) => (
                <span key={node.id}>
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  <button type="button" onClick={() => navigateTo(node.id)}>
                    {node.kind === "root" ? "Archive" : node.name}
                  </button>
                </span>
              ))}
            </nav>
            <div
              className="archive-toolbar"
              role="group"
              aria-label="Archive controls"
            >
              <button
                type="button"
                disabled={!canCreate}
                onClick={() => {
                  setCreationMode("note");
                  setCreationName("");
                }}
              >
                New note
              </button>
              <button
                type="button"
                disabled={!canCreate}
                onClick={() => {
                  setCreationMode("folder");
                  setCreationName("");
                }}
              >
                New folder
              </button>
              <span
                className="archive-view-switch"
                role="group"
                aria-label="View mode"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                >
                  List
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </button>
              </span>
            </div>
          </div>

          {creationMode ? (
            <form className="archive-create" onSubmit={handleCreate}>
              <label htmlFor={creationId}>
                {creationMode === "folder" ? "Folder name" : "Note name"}
              </label>
              <input
                id={creationId}
                value={creationName}
                onChange={(event) => setCreationName(event.target.value)}
                maxLength={80}
                autoFocus
                required
              />
              <button type="submit">Create</button>
              <button
                type="button"
                onClick={() => {
                  setCreationMode(null);
                  setCreationName("");
                }}
              >
                Cancel
              </button>
            </form>
          ) : null}

          <div
            className="archive-browser-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{normalizedQuery ? `Search / ${normalizedQuery}` : currentFolder?.name}</span>
            <span>
              {displayItems.length} {displayItems.length === 1 ? "item" : "items"}
              {hasMoreItems ? ` · ${renderedItems.length} shown` : ""}
              {" · "}
              {archiveCompactNumberFormat.format(fileIndex.noteCharacterCount)}{" "}
              chars stored
            </span>
          </div>

          {displayItems.length ? (
            <div className="archive-results">
              <div
                className="archive-items"
                data-view={viewMode}
                role="listbox"
                aria-label={
                  normalizedQuery ? "Archive search results" : "Folder contents"
                }
              >
                {renderedItems.map((node, index) => {
                  const path = fileIndex.getNodePath(node.id);
                  const context = normalizedQuery
                    ? path
                        .slice(0, -1)
                        .map((item) =>
                          item.kind === "root" ? "Archive" : item.name,
                        )
                        .join(" / ")
                    : node.summary;
                  return (
                    <button
                      key={node.id}
                      data-archive-node-id={node.id}
                      ref={(element) => {
                        itemRefs.current[index] = element;
                      }}
                      type="button"
                      role="option"
                      aria-selected={selectedNode?.id === node.id}
                      aria-posinset={index + 1}
                      aria-setsize={displayItems.length}
                      tabIndex={
                        // Roving tabindex follows a visible selection. A
                        // selection outside this progressive batch leaves the
                        // first rendered option as the listbox entry point.
                        selectedNode && renderedItemIds.has(selectedNode.id)
                          ? selectedNode.id === node.id
                            ? 0
                            : -1
                          : index === 0
                            ? 0
                            : -1
                      }
                      onClick={() => {
                        setSelectedId(node.id);
                        setConfirmDeleteId(null);
                      }}
                      onDoubleClick={() => openNode(node)}
                      onKeyDown={(event) => handleItemKeyDown(event, node, index)}
                    >
                      <span
                        className="archive-node-mark"
                        data-kind={node.kind}
                        aria-hidden="true"
                      />
                      <span className="archive-item-copy">
                        <strong>{node.name}</strong>
                        <small>{context || kindLabel(node.kind)}</small>
                      </span>
                      <span className="archive-item-kind">
                        {kindLabel(node.kind)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {hasMoreItems ? (
                <button
                  type="button"
                  className="archive-load-more"
                  onClick={showNextItems}
                >
                  <span>
                    Show next{" "}
                    {Math.min(
                      ARCHIVE_RENDER_BATCH,
                      displayItems.length - renderedItems.length,
                    )}
                  </span>
                  <span className="archive-load-more-count">
                    {displayItems.length - renderedItems.length} remaining
                  </span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="archive-empty">
              <span className="archive-node-mark" data-kind="note" aria-hidden="true" />
              <p>{normalizedQuery ? "No local files match this search." : "This location is empty."}</p>
              {isTrashView && !normalizedQuery ? <small>Deleted items will appear here.</small> : null}
            </div>
          )}
        </section>

        <aside className="archive-preview" aria-label="Selected item preview">
          {selectedNode ? (
            <>
              <header>
                <span className="archive-node-mark" data-kind={selectedNode.kind} aria-hidden="true" />
                <div>
                  <span>{kindLabel(selectedNode.kind)}</span>
                  <h2>{selectedNode.name}</h2>
                </div>
              </header>

              {renameId === selectedNode.id ? (
                <form className="archive-rename" onSubmit={handleRename}>
                  <label htmlFor={renameInputId}>Rename item</label>
                  <input
                    id={renameInputId}
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    maxLength={80}
                    autoFocus
                    required
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setRenameId(null)}>Cancel</button>
                </form>
              ) : null}

              <p className="archive-preview-summary">
                {selectedNode.summary || "A locally created archive item."}
              </p>

              <dl className="archive-preview-meta">
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(selectedNode.updatedAt)}</dd>
                </div>
                <div>
                  <dt>Path</dt>
                  <dd>
                    {fileIndex
                      .getNodePath(selectedNode.id)
                      .map((node) =>
                        node.kind === "root" ? "Archive" : node.name,
                      )
                      .join(" / ")}
                  </dd>
                </div>
                {selectedNode.kind === "folder" ? (
                  <div>
                    <dt>Contains</dt>
                    <dd>{fileIndex.listChildren(selectedNode.id).length} items</dd>
                  </div>
                ) : null}
                {selectedNode.kind === "app" ? (
                  <div><dt>Target</dt><dd>{selectedNode.appId}</dd></div>
                ) : null}
                {selectedNode.kind === "external" ? (
                  <div><dt>Address</dt><dd>{selectedNode.href.replace(/^https?:\/\//, "")}</dd></div>
                ) : null}
              </dl>

              {selectedNode.kind === "note" ? (
                <label className="archive-note-editor" htmlFor={noteEditorId}>
                  <span>{selectedIsTrashed ? "Note body / read only in trash" : "Note body / saves locally"}</span>
                  <textarea
                    id={noteEditorId}
                    value={selectedNode.content}
                    maxLength={200_000}
                    readOnly={selectedIsTrashed}
                    onChange={(event) => {
                      const nextFiles = editNote(
                        files,
                        selectedNode.id,
                        event.target.value,
                        new Date().toISOString(),
                      );
                      commitFilesMutation(
                        nextFiles,
                        event.target.value !== selectedNode.content,
                      );
                    }}
                    spellCheck
                  />
                </label>
              ) : null}

              <div className="archive-preview-actions">
                {selectedNode.kind === "folder" ||
                selectedNode.kind === "root" ||
                selectedNode.kind === "trash" ? (
                  <button type="button" onClick={() => openNode(selectedNode)}>Open</button>
                ) : null}
                {selectedNode.kind === "app" ? (
                  <button type="button" onClick={() => onOpenApp(selectedNode.appId)}>
                    Open application
                  </button>
                ) : null}
                {selectedNode.kind === "external" ? (
                  <button type="button" onClick={() => onOpenExternal(selectedNode.href)}>
                    Open external site
                  </button>
                ) : null}
                {selectedNode.kind !== "root" && selectedNode.kind !== "trash" && !selectedIsTrashed ? (
                  <>
                    <button type="button" onClick={() => beginRename(selectedNode)}>Rename</button>
                    <button type="button" className="is-destructive" onClick={moveSelectedToTrash}>
                      Move to trash
                    </button>
                  </>
                ) : null}
                {selectedCanRestore ? (
                  <button type="button" onClick={restoreSelected}>Restore</button>
                ) : null}
                {selectedIsTrashed ? (
                  <button
                    type="button"
                    className="is-destructive"
                    onClick={() => beginDeleteConfirmation(selectedNode.id)}
                  >
                    Delete permanently
                  </button>
                ) : null}
              </div>

            </>
          ) : (
            <div className="archive-preview-empty">
              <span>Preview</span>
              <h2>Select an item.</h2>
              <p>Open folders, edit notes, or launch a shortcut from here.</p>
              <dl>
                <div><dt>Enter</dt><dd>Open</dd></div>
                <div><dt>F2</dt><dd>Rename</dd></div>
                <div>
                  <dt>Delete</dt>
                  <dd>{isTrashView ? "Delete permanently" : "Move to trash"}</dd>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </div>

        <footer className="archive-local-note">
          <span className="archive-local-indicator" aria-hidden="true" />
          This archive lives only in this browser. Nothing is uploaded.
        </footer>
      </div>

      {deleteTargetNode ? (
        <div className="archive-delete-backdrop">
          <div
            ref={deleteDialogRef}
            className="archive-delete-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={deleteDialogTitleId}
            aria-describedby={deleteDialogDescriptionId}
            tabIndex={-1}
            onKeyDown={handleDeleteDialogKeyDown}
          >
            <p id={deleteDialogTitleId}>
              Permanently delete “{deleteTargetNode.name}” and anything inside it?
            </p>
            <p id={deleteDialogDescriptionId}>
              This removes the local item immediately and cannot be undone.
            </p>
            <div>
              <button
                ref={confirmDeleteButtonRef}
                type="button"
                onClick={deleteSelectedForever}
              >
                Delete permanently
              </button>
              <button
                ref={keepDeleteButtonRef}
                type="button"
                onClick={cancelDeleteConfirmation}
              >
                Keep item
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
