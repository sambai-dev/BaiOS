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
  getFileNode,
  getNodePath,
  isNodeInTrash,
  listChildren,
  moveToTrash,
  permanentlyDelete,
  renameNode,
  restoreFromTrash,
  searchFiles,
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

function isContainer(node: FileNode | undefined) {
  return node?.kind === "root" || node?.kind === "folder" || node?.kind === "trash";
}

function kindLabel(kind: FileNode["kind"]) {
  if (kind === "app") return "Application";
  if (kind === "external") return "External link";
  if (kind === "root") return "Volume";
  return `${kind.slice(0, 1).toUpperCase()}${kind.slice(1)}`;
}

function formatDate(value: string) {
  const [date] = value.split("T");
  return date || "Local session";
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
  const [folderFocusRequest, setFolderFocusRequest] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deleteReturnFocusRef = useRef<HTMLElement | null>(null);
  const keepDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFolderFocusRef = useRef<string | null>(null);
  const pendingRemovalFocusIndexRef = useRef<number | null>(null);
  const searchId = useId();
  const creationId = useId();
  const noteEditorId = useId();
  const renameInputId = useId();
  const deleteDialogTitleId = useId();
  const deleteDialogDescriptionId = useId();

  const requestedFolder = getFileNode(files, currentFolderId);
  const currentFolder = isContainer(requestedFolder)
    ? requestedFolder
    : getFileNode(files, ROOT_FILE_ID);
  const resolvedFolderId = currentFolder?.id ?? ROOT_FILE_ID;
  const isTrashView =
    resolvedFolderId === TRASH_FILE_ID || isNodeInTrash(files, resolvedFolderId);
  const normalizedQuery = query.trim();

  const displayItems = (() => {
    if (!normalizedQuery) return listChildren(files, resolvedFolderId);
    const results = searchFiles(files, normalizedQuery, { includeTrash: isTrashView });
    return isTrashView
      ? results.filter((node) => isNodeInTrash(files, node.id))
      : results;
  })();

  const selectedNode = selectedId
    ? displayItems.find((node) => node.id === selectedId) ?? getFileNode(files, selectedId)
    : undefined;
  const selectedIsTrashed = selectedNode
    ? isNodeInTrash(files, selectedNode.id)
    : false;
  const selectedCanRestore = Boolean(
    selectedNode &&
      selectedNode.kind !== "root" &&
      selectedNode.kind !== "trash" &&
      selectedNode.parentId === TRASH_FILE_ID &&
      selectedNode.trashed,
  );
  const breadcrumb = currentFolder ? getNodePath(files, currentFolder.id) : [];
  const locations = locationIds
    .map((id) => getFileNode(files, id))
    .filter((node): node is FileNode => Boolean(node));
  const canCreate =
    !isTrashView && (currentFolder?.kind === "root" || currentFolder?.kind === "folder");

  const commitFilesMutation = (
    nextFiles: WorkbenchFiles,
    reportRejection = true,
  ) => {
    if (nextFiles === files) {
      if (reportRejection) onMutationRejected?.(archiveLimitMessage);
      return false;
    }
    onFilesChange(nextFiles);
    return true;
  };

  const commitRemovalMutation = (
    nextFiles: WorkbenchFiles,
    removedNodeId: string,
  ) => {
    const removedIndex = displayItems.findIndex(
      (node) => node.id === removedNodeId,
    );
    pendingRemovalFocusIndexRef.current = Math.max(0, removedIndex);
    if (!commitFilesMutation(nextFiles)) {
      pendingRemovalFocusIndexRef.current = null;
      return false;
    }
    setSelectedId(null);
    return true;
  };

  useEffect(() => {
    if (!confirmDeleteId) return;
    const frame = window.requestAnimationFrame(() => {
      keepDeleteButtonRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [confirmDeleteId]);

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
    const target = getFileNode(files, folderId);
    if (!isContainer(target)) return;
    pendingFolderFocusRef.current = folderId;
    setFolderFocusRequest((request) => request + 1);
    setSelectedId(null);
    setConfirmDeleteId(null);
    setRenameId(null);
    setQuery("");
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
    const safeIndex = Math.max(0, Math.min(displayItems.length - 1, index));
    const node = displayItems[safeIndex];
    if (!node) return;
    setSelectedId(node.id);
    itemRefs.current[safeIndex]?.focus();
  };

  const beginDeleteConfirmation = (nodeId: string) => {
    deleteReturnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setConfirmDeleteId(nodeId);
  };

  const cancelDeleteConfirmation = () => {
    const returnTarget = deleteReturnFocusRef.current;
    setConfirmDeleteId(null);
    window.requestAnimationFrame(() => {
      if (returnTarget?.isConnected) {
        returnTarget.focus({ preventScroll: true });
        return;
      }
      const selectedIndex = displayItems.findIndex(
        (node) => node.id === selectedId,
      );
      const fallbackItem =
        selectedIndex >= 0 ? itemRefs.current[selectedIndex] : null;
      (fallbackItem ?? searchInputRef.current)?.focus({ preventScroll: true });
    });
  };

  const handleItemKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    node: FileNode,
    index: number,
  ) => {
    let nextIndex = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (index + 1) % displayItems.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (index - 1 + displayItems.length) % displayItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = displayItems.length - 1;
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
      if (isNodeInTrash(files, node.id)) beginDeleteConfirmation(node.id);
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
    focusItem(nextIndex);
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
    }
    setCreationMode(null);
    setCreationName("");
  };

  const beginRename = (node: FileNode) => {
    if (node.kind === "root" || node.kind === "trash") return;
    setRenameId(node.id);
    setRenameValue(node.name);
  };

  const handleRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNode || selectedNode.id !== renameId || !renameValue.trim()) return;
    commitFilesMutation(
      renameNode(files, selectedNode.id, renameValue, new Date().toISOString()),
      renameValue.trim() !== selectedNode.name,
    );
    setRenameId(null);
    setRenameValue("");
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
    if (
      commitFilesMutation(
        restoreFromTrash(files, selectedNode.id, new Date().toISOString()),
      )
    ) {
      setSelectedId(null);
    }
  };

  const deleteSelectedForever = () => {
    if (!selectedNode || confirmDeleteId !== selectedNode.id) return;
    if (
      !commitRemovalMutation(
        permanentlyDelete(files, selectedNode.id),
        selectedNode.id,
      )
    ) {
      return;
    }
    setConfirmDeleteId(null);
    deleteReturnFocusRef.current = null;
  };

  return (
    <div className="archive-app">
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
            <div className="archive-toolbar" aria-label="Archive controls">
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
              <span className="archive-view-switch" aria-label="View mode">
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

          <div className="archive-browser-status" role="status" aria-live="polite">
            <span>{normalizedQuery ? `Search / ${normalizedQuery}` : currentFolder?.name}</span>
            <span>
              {displayItems.length} {displayItems.length === 1 ? "item" : "items"}
              {" · "}
              {new Intl.NumberFormat("en-NZ", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(
                files.nodes
                  .filter((node) => node.kind === "note")
                  .reduce(
                    (sum, node) =>
                      sum + (node.kind === "note" ? node.content.length : 0),
                    0,
                  ),
              )}{" "}
              chars stored
            </span>
          </div>

          {displayItems.length ? (
            <div
              className="archive-items"
              data-view={viewMode}
              role="listbox"
              aria-label={normalizedQuery ? "Archive search results" : "Folder contents"}
            >
              {displayItems.map((node, index) => {
                const path = getNodePath(files, node.id);
                const context = normalizedQuery
                  ? path.slice(0, -1).map((item) => item.kind === "root" ? "Archive" : item.name).join(" / ")
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
                    tabIndex={selectedNode ? (selectedNode.id === node.id ? 0 : -1) : index === 0 ? 0 : -1}
                    onClick={() => {
                      setSelectedId(node.id);
                      setConfirmDeleteId(null);
                    }}
                    onDoubleClick={() => openNode(node)}
                    onKeyDown={(event) => handleItemKeyDown(event, node, index)}
                  >
                    <span className="archive-node-mark" data-kind={node.kind} aria-hidden="true" />
                    <span className="archive-item-copy">
                      <strong>{node.name}</strong>
                      <small>{context || kindLabel(node.kind)}</small>
                    </span>
                    <span className="archive-item-kind">{kindLabel(node.kind)}</span>
                  </button>
                );
              })}
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
                  <dd>{getNodePath(files, selectedNode.id).map((node) => node.kind === "root" ? "Archive" : node.name).join(" / ")}</dd>
                </div>
                {selectedNode.kind === "folder" ? (
                  <div>
                    <dt>Contains</dt>
                    <dd>{listChildren(files, selectedNode.id).length} items</dd>
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
                    Delete forever
                  </button>
                ) : null}
              </div>

              {confirmDeleteId === selectedNode.id ? (
                <div
                  className="archive-delete-confirm"
                  role="alertdialog"
                  aria-labelledby={deleteDialogTitleId}
                  aria-describedby={deleteDialogDescriptionId}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    event.preventDefault();
                    event.stopPropagation();
                    cancelDeleteConfirmation();
                  }}
                >
                  <p id={deleteDialogTitleId}>
                    Delete “{selectedNode.name}” and anything inside it permanently?
                  </p>
                  <p id={deleteDialogDescriptionId}>
                    This removes the local item immediately and cannot be undone.
                  </p>
                  <div>
                    <button type="button" onClick={deleteSelectedForever}>Confirm delete</button>
                    <button
                      ref={keepDeleteButtonRef}
                      type="button"
                      onClick={cancelDeleteConfirmation}
                    >
                      Keep item
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="archive-preview-empty">
              <span>Preview</span>
              <h2>Select an item.</h2>
              <p>Open folders, edit notes, or launch a shortcut from here.</p>
              <dl>
                <div><dt>Enter</dt><dd>Open</dd></div>
                <div><dt>F2</dt><dd>Rename</dd></div>
                <div><dt>Delete</dt><dd>Move to trash</dd></div>
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
  );
}
