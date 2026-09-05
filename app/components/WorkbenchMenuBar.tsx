// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WorkspaceId } from "../lib/workbench-system";

export type WorkbenchMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
};

export type WorkbenchMenu = {
  id: string;
  label: string;
  items: WorkbenchMenuItem[];
};

export type WorkbenchMenuBarProps = {
  activeAppLabel: string;
  backgroundInert?: boolean;
  time: string;
  workspaceLabel: string;
  workspaces: Array<{ id: WorkspaceId; label: string }>;
  activeWorkspaceId: WorkspaceId;
  onSwitchWorkspace: (id: WorkspaceId) => void;
  menus: WorkbenchMenu[];
  onOpenMissionControl: () => void;
  onOpenSearch: () => void;
  onClosePortfolio: () => void;
  portfolioButtonRef?: RefObject<HTMLButtonElement | null>;
};

type MenuPosition = {
  left: number;
  top: number;
};

const MENU_GUTTER = 8;
const MENU_WIDTH = 272;

function wrapIndex(index: number, length: number) {
  return (index + length) % length;
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export default function WorkbenchMenuBar({
  activeAppLabel,
  backgroundInert = false,
  time,
  workspaceLabel,
  workspaces,
  activeWorkspaceId,
  onSwitchWorkspace,
  menus: sourceMenus,
  onOpenMissionControl,
  onOpenSearch,
  onClosePortfolio,
  portfolioButtonRef,
}: WorkbenchMenuBarProps) {
  const menus = useMemo<WorkbenchMenu[]>(() => {
    const items = (id: string) => sourceMenus.find((menu) => menu.id === id)?.items ?? [];
    const readableLabels: Record<string, string> = {
      about: "About Sam",
      control: "Settings",
      "open-archive-root": "Open files",
      export: "Download a backup",
      tidy: "Arrange windows",
      "close-all": "Close all windows in this workspace",
    };
    const readable = (item: WorkbenchMenuItem): WorkbenchMenuItem => ({
      ...item,
      label: readableLabels[item.id] ?? item.label,
    });
    return [
      {
        id: "desktop",
        label: "Desktop",
        items: [
          ...items("workbench").filter((item) => item.id !== "return"),
          ...items("file").filter((item) => ["open-archive-root", "export"].includes(item.id)),
          ...items("view").filter((item) => item.id === "tidy"),
          ...items("go").filter((item) => item.id !== "go-archive"),
        ].map(readable),
      },
      {
        id: "window",
        label: "Window",
        items: [
          ...items("file").filter((item) => item.id === "new-active" && !item.disabled),
          ...items("window"),
          ...items("file").filter((item) => item.id === "close-window"),
        ].map(readable),
      },
    ];
  }, [sourceMenus]);
  const instanceId = safeId(useId());
  const barRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const itemRefs = useRef<Record<string, Array<HTMLButtonElement | null>>>({});
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    left: MENU_GUTTER,
    top: 0,
  });

  const activeMenu = openMenuIndex === null ? null : menus[openMenuIndex] ?? null;

  const enabledItemIndices = useCallback(
    (menuIndex: number) =>
      (menus[menuIndex]?.items ?? []).reduce<number[]>((indices, item, itemIndex) => {
        if (!item.disabled) indices.push(itemIndex);
        return indices;
      }, []),
    [menus],
  );

  const placeMenu = useCallback((menuIndex: number) => {
    const trigger = triggerRefs.current[menuIndex];
    if (!trigger) return;

    const bounds = trigger.getBoundingClientRect();
    const availableWidth = Math.max(0, window.innerWidth - MENU_GUTTER * 2);
    const popupWidth = Math.min(MENU_WIDTH, availableWidth);
    const left = Math.min(
      Math.max(bounds.left, MENU_GUTTER),
      Math.max(MENU_GUTTER, window.innerWidth - popupWidth - MENU_GUTTER),
    );
    // Clamp vertically: a short viewport must not push the popup off-screen.
    const estimatedHeight = Math.min(
      window.innerHeight - MENU_GUTTER * 2,
      320,
    );
    const top = Math.min(
      bounds.bottom,
      Math.max(MENU_GUTTER, window.innerHeight - estimatedHeight - MENU_GUTTER),
    );

    setMenuPosition({ left, top });
  }, []);

  const focusMenuItem = useCallback((menuId: string, itemIndex: number) => {
    window.requestAnimationFrame(() => {
      itemRefs.current[menuId]?.[itemIndex]?.focus();
    });
  }, []);

  const openMenu = useCallback(
    (menuIndex: number, edge: "first" | "last" = "first") => {
      const menu = menus[menuIndex];
      if (!menu) return;

      const enabled = enabledItemIndices(menuIndex);
      const itemIndex = edge === "last" ? enabled.at(-1) ?? -1 : enabled[0] ?? -1;
      placeMenu(menuIndex);
      setOpenMenuIndex(menuIndex);
      setFocusedMenuIndex(menuIndex);
      setActiveItemIndex(itemIndex);
      if (itemIndex >= 0) focusMenuItem(menu.id, itemIndex);
    },
    [enabledItemIndices, focusMenuItem, menus, placeMenu],
  );

  const closeMenu = useCallback((restoreFocus = false) => {
    const triggerIndex = openMenuIndex;
    setOpenMenuIndex(null);
    setActiveItemIndex(-1);

    if (restoreFocus && triggerIndex !== null) {
      window.requestAnimationFrame(() => triggerRefs.current[triggerIndex]?.focus());
    }
  }, [openMenuIndex]);

  const moveToMenu = useCallback(
    (nextMenuIndex: number) => {
      if (!menus.length) return;
      const wrappedIndex = wrapIndex(nextMenuIndex, menus.length);
      setFocusedMenuIndex(wrappedIndex);

      if (openMenuIndex !== null) {
        openMenu(wrappedIndex);
      } else {
        triggerRefs.current[wrappedIndex]?.focus();
      }
    },
    [menus.length, openMenu, openMenuIndex],
  );

  const moveWithinMenu = useCallback(
    (menuIndex: number, direction: 1 | -1) => {
      const menu = menus[menuIndex];
      if (!menu) return;

      const enabled = enabledItemIndices(menuIndex);
      if (!enabled.length) return;

      const currentEnabledIndex = enabled.indexOf(activeItemIndex);
      const nextEnabledIndex =
        currentEnabledIndex < 0
          ? direction === 1
            ? 0
            : enabled.length - 1
          : wrapIndex(currentEnabledIndex + direction, enabled.length);
      const itemIndex = enabled[nextEnabledIndex];
      if (itemIndex === undefined) return;

      setActiveItemIndex(itemIndex);
      focusMenuItem(menu.id, itemIndex);
    },
    [activeItemIndex, enabledItemIndices, focusMenuItem, menus],
  );

  const selectItem = useCallback(
    (item: WorkbenchMenuItem) => {
      if (item.disabled) return;
      // Run the action first so it can claim focus (palette, guard, dialog);
      // only fall back to the trigger when focus was not moved.
      setOpenMenuIndex(null);
      setActiveItemIndex(-1);
      item.onSelect();
      window.requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active === document.body || active === null) {
          const triggerIndex = openMenuIndex;
          if (triggerIndex !== null) {
            triggerRefs.current[triggerIndex]?.focus({ preventScroll: true });
          }
        }
      });
    },
    [openMenuIndex],
  );

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    menuIndex: number,
  ) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveToMenu(menuIndex + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveToMenu(menuIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        moveToMenu(0);
        break;
      case "End":
        event.preventDefault();
        moveToMenu(menus.length - 1);
        break;
      case "ArrowDown":
        event.preventDefault();
        openMenu(menuIndex, "first");
        break;
      case "ArrowUp":
        event.preventDefault();
        openMenu(menuIndex, "last");
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (openMenuIndex === menuIndex) closeMenu(true);
        else openMenu(menuIndex);
        break;
      case "Escape":
        if (openMenuIndex !== null) {
          event.preventDefault();
          event.stopPropagation();
          closeMenu(true);
        }
        break;
      default:
        break;
    }
  };

  const handleItemKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    menuIndex: number,
    itemIndex: number,
    item: WorkbenchMenuItem,
  ) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveWithinMenu(menuIndex, 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveWithinMenu(menuIndex, -1);
        break;
      case "Home": {
        event.preventDefault();
        const first = enabledItemIndices(menuIndex)[0];
        const homeMenu = menus[menuIndex];
        if (first !== undefined && homeMenu) {
          setActiveItemIndex(first);
          focusMenuItem(homeMenu.id, first);
        }
        break;
      }
      case "End": {
        event.preventDefault();
        const last = enabledItemIndices(menuIndex).at(-1);
        const endMenu = menus[menuIndex];
        if (last !== undefined && endMenu) {
          setActiveItemIndex(last);
          focusMenuItem(endMenu.id, last);
        }
        break;
      }
      case "ArrowRight":
        event.preventDefault();
        openMenu(wrapIndex(menuIndex + 1, menus.length));
        break;
      case "ArrowLeft":
        event.preventDefault();
        openMenu(wrapIndex(menuIndex - 1, menus.length));
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
        break;
      case "Tab":
        triggerRefs.current[menuIndex]?.focus({ preventScroll: true });
        closeMenu();
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectItem(item);
        break;
      default:
        setActiveItemIndex(itemIndex);
        break;
    }
  };

  useEffect(() => {
    if (openMenuIndex === null) return;

    const handleOutsidePointer = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) closeMenu();
    };
    const handleViewportChange = () => placeMenu(openMenuIndex);

    document.addEventListener("pointerdown", handleOutsidePointer);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeMenu, openMenuIndex, placeMenu]);

  return (
    <header
      className="workbench-menu-bar"
      ref={barRef}
      aria-hidden={backgroundInert || undefined}
      inert={backgroundInert || undefined}
    >
      <div className="wmb-leading">
        <div className="wmb-context">
          <span className="wmb-mark" aria-hidden="true">S/B</span>
          <strong>Workbench</strong>
        </div>

        <nav className="wmb-menu-strip" aria-label="Application menus">
          <div className="wmb-menubar" role="menubar" aria-label={`${activeAppLabel} menus`}>
            {menus.map((menu, menuIndex) => {
              const menuId = `${instanceId}-menu-${safeId(menu.id)}`;
              const isOpen = openMenuIndex === menuIndex;

              return (
                <div className="wmb-menu-trigger-wrap" role="none" key={menu.id}>
                  <button
                    ref={(element) => {
                      triggerRefs.current[menuIndex] = element;
                    }}
                    className={isOpen ? "is-open" : undefined}
                    type="button"
                    role="menuitem"
                    aria-label={menu.label}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? menuId : undefined}
                    tabIndex={focusedMenuIndex === menuIndex ? 0 : -1}
                    onClick={() => {
                      if (isOpen) closeMenu(true);
                      else openMenu(menuIndex);
                    }}
                    onKeyDown={(event) => handleTriggerKeyDown(event, menuIndex)}
                    onFocus={() => setFocusedMenuIndex(menuIndex)}
                    onPointerEnter={() => {
                      if (openMenuIndex !== null && !isOpen) openMenu(menuIndex);
                    }}
                  >
                    <span className="wmb-menu-label">{menu.label}</span>
                    <span className="wmb-chevron" aria-hidden="true">⌄</span>
                  </button>
                </div>
              );
            })}
          </div>
        </nav>
      </div>

      <nav className="wmb-workspaces" aria-label="Workspaces">
        {workspaces.map((workspace, index) => (
          <button
            key={workspace.id}
            type="button"
            aria-pressed={workspace.id === activeWorkspaceId}
            title={`Switch to ${workspace.label} workspace (Alt+${index + 1})`}
            onClick={() => onSwitchWorkspace(workspace.id)}
          >
            <span className="wmb-workspace-dot" aria-hidden="true" />
            {workspace.label}
          </button>
        ))}
      </nav>

      <div className="wmb-system" role="group" aria-label="System controls">
        <div className="wmb-system-data">
          <span aria-label={`New Zealand time ${time}`}>{time}<span className="wmb-timezone"> NZ</span></span>
        </div>
        <button
          type="button"
          aria-label="Window overview"
          title="See all windows and workspaces (F3)"
          aria-keyshortcuts="F3"
          onClick={onOpenMissionControl}
        >
          <svg className="wmb-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3" width="7" height="6" /><rect x="12" y="3" width="6" height="10" /><rect x="2" y="12" width="7" height="5" /></svg>
          <span className="wmb-control-label">Overview</span>
        </button>
        <button
          type="button"
          aria-keyshortcuts="Control+K Meta+K"
          title="Find applications, files, and commands (Ctrl or ⌘ + K)"
          onClick={onOpenSearch}
        >
          <svg className="wmb-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4.5 4.5" /></svg>
          <span className="wmb-control-label">Search</span>
        </button>
        <button
          ref={portfolioButtonRef}
          type="button"
          aria-keyshortcuts="Escape"
          aria-label="Back to portfolio"
          title="Back to the portfolio (Escape)"
          onClick={onClosePortfolio}
        >
          <svg className="wmb-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M17 10H3m6-6-6 6 6 6" /></svg>
          <span className="wmb-control-label">Back<span className="wmb-back-detail"> to site</span></span>
        </button>
      </div>

      {activeMenu && openMenuIndex !== null && (
        <div
          className="wmb-popup"
          id={`${instanceId}-menu-${safeId(activeMenu.id)}`}
          role="menu"
          aria-label={activeMenu.label}
          style={{ left: menuPosition.left, top: menuPosition.top }}
        >
          <div className="wmb-popup-label" aria-hidden="true">
            <span>{activeMenu.id === "desktop" ? workspaceLabel : activeAppLabel}</span>
            <strong>{activeMenu.label}</strong>
          </div>
          {activeMenu.items.map((item, itemIndex) => (
            <button
              ref={(element) => {
                const menuItems = itemRefs.current[activeMenu.id] ?? [];
                menuItems[itemIndex] = element;
                itemRefs.current[activeMenu.id] = menuItems;
              }}
              className={`${item.danger ? "is-danger" : ""}${
                activeItemIndex === itemIndex ? " is-active" : ""
              }`}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              aria-disabled={item.disabled || undefined}
              tabIndex={activeItemIndex === itemIndex ? 0 : -1}
              key={item.id}
              onClick={() => selectItem(item)}
              onFocus={() => setActiveItemIndex(itemIndex)}
              onKeyDown={(event) =>
                handleItemKeyDown(event, openMenuIndex, itemIndex, item)
              }
            >
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
