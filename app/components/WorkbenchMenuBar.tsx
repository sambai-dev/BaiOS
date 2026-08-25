// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

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
  time: string;
  workspaceLabel: string;
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
  time,
  workspaceLabel,
  menus,
  onOpenMissionControl,
  onOpenSearch,
  onClosePortfolio,
  portfolioButtonRef,
}: WorkbenchMenuBarProps) {
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

    setMenuPosition({ left, top: bounds.bottom });
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
      const triggerIndex = openMenuIndex;
      if (triggerIndex !== null) {
        triggerRefs.current[triggerIndex]?.focus({ preventScroll: true });
      }
      setOpenMenuIndex(null);
      setActiveItemIndex(-1);
      item.onSelect();
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
    <header className="workbench-menu-bar" ref={barRef}>
      <div className="wmb-leading">
        <span className="wmb-mark" aria-hidden="true">S/B</span>
        <div className="wmb-context" aria-live="polite">
          <span className="wmb-context-name">Workbench</span>
          <strong>{activeAppLabel}</strong>
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
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={menuId}
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
                    {menu.label}
                  </button>
                </div>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="wmb-system" aria-label="System controls">
        <div className="wmb-system-data" aria-label={`${workspaceLabel}, ${time}`}>
          <span className="wmb-workspace"><i aria-hidden="true" />{workspaceLabel}</span>
          <time>{time}</time>
        </div>
        <button
          type="button"
          aria-label="Open Atlas overview"
          aria-keyshortcuts="F3"
          onClick={onOpenMissionControl}
        >
          <span className="wmb-control-label">Atlas</span><kbd>F3</kbd>
        </button>
        <button type="button" aria-keyshortcuts="/" onClick={onOpenSearch}>
          <span className="wmb-control-label">Search</span><kbd>/</kbd>
        </button>
        <button
          ref={portfolioButtonRef}
          type="button"
          aria-keyshortcuts="Escape"
          onClick={onClosePortfolio}
        >
          <span className="wmb-control-label">Portfolio</span><kbd>Esc</kbd>
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
            <span>{activeAppLabel}</span>
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
