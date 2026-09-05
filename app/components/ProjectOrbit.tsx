// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { createOrbitPath, getOrbitPoint, portfolioProjects, type OrbitPath, type PortfolioProject } from "@/app/lib/portfolio-projects";
import ProjectMedia from "./ProjectMedia";
import "@/app/styles/project-orbit.css";

const START_PROGRESS = -0.28;
const INITIAL_PATH = createOrbitPath(1200, 570);
const AUTOPLAY_PIXELS_PER_MS = 0.018;
const MAX_GLIDE_PIXELS_PER_MS = 0.36;
const GLIDE_DECAY_MS = 210;

export default function ProjectOrbit({
  suspended,
  onOpenProject,
  onPreload,
}: {
  suspended: boolean;
  onOpenProject: (project: PortfolioProject, invoker: HTMLElement) => void;
  onPreload: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const progressRef = useRef(START_PROGRESS);
  const pathRef = useRef<OrbitPath | null>(null);
  const velocityRef = useRef(0);
  const paintRef = useRef<(() => void) | null>(null);
  const syncMotionRef = useRef<(() => void) | null>(null);
  const motionRef = useRef({ suspended, active: activeId !== null });
  const dragRef = useRef<{ pointerId: number; x: number; y: number; anchorIndex: number; moved: boolean; lastX: number; lastY: number; lastTime: number } | null>(null);
  const suppressClickRef = useRef(false);
  const activeProject = portfolioProjects.find((project) => project.id === activeId);

  useEffect(() => {
    motionRef.current = { suspended, active: activeId !== null };
    syncMotionRef.current?.();
  }, [suspended, activeId]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 620px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || compact) return;
    let width = stage.clientWidth;
    let height = stage.clientHeight;
    pathRef.current = createOrbitPath(width, height);
    // The observer starts motion only once the stage is actually on screen.
    let visible = false;
    let frame: number | null = null;
    let lastTime = 0;
    const paint = () => {
      const path = pathRef.current;
      if (!path) return;
      itemRefs.current.forEach((element, index) => {
        if (!element) return;
        const position = getOrbitPoint(path, progressRef.current + index / portfolioProjects.length);
        element.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) scale(${position.scale})`;
      });
    };
    paintRef.current = paint;
    const resize = new ResizeObserver(([entry]) => {
      if (!entry || (width === entry.contentRect.width && height === entry.contentRect.height)) return;
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      // Keep the current lap position while rebuilding only the geometry.
      pathRef.current = createOrbitPath(width, height);
      paint();
    });
    resize.observe(stage);
    const canAnimate = () => {
      const state = motionRef.current;
      return visible && !document.hidden && !state.suspended && !state.active && !dragRef.current && !reducedMotion;
    };
    const tick = (time: number) => {
      frame = null;
      if (!canAnimate()) {
        lastTime = 0;
        return;
      }
      const elapsed = lastTime ? Math.min(time - lastTime, 50) : 0;
      lastTime = time;
      const decay = Math.exp(-elapsed / GLIDE_DECAY_MS);
      const travel = AUTOPLAY_PIXELS_PER_MS * elapsed + velocityRef.current * GLIDE_DECAY_MS * (1 - decay);
      progressRef.current = (progressRef.current + travel / (pathRef.current?.length ?? 1)) % 1;
      velocityRef.current *= decay;
      if (Math.abs(velocityRef.current) < 0.001) velocityRef.current = 0;
      paint();
      frame = requestAnimationFrame(tick);
    };
    const syncMotion = () => {
      if (!canAnimate()) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        lastTime = 0;
        // Returning to the page must not replay an old swipe's momentum.
        if (!dragRef.current) velocityRef.current = 0;
      } else if (frame === null) {
        frame = requestAnimationFrame(tick);
      }
    };
    syncMotionRef.current = syncMotion;
    const intersection = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      visible = entry.isIntersecting;
      syncMotion();
    });
    intersection.observe(stage);
    document.addEventListener("visibilitychange", syncMotion);
    paint();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", syncMotion);
      resize.disconnect();
      intersection.disconnect();
      paintRef.current = null;
      syncMotionRef.current = null;
    };
  }, [reducedMotion, compact]);

  const finishDrag = useCallback((pointerId?: number, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || (pointerId !== undefined && drag.pointerId !== pointerId)) return;
    suppressClickRef.current = drag.moved && !cancelled;
    // Holding still before release is an intentional stop, not a stored fling.
    const timeSinceMove = performance.now() - drag.lastTime;
    if (cancelled || timeSinceMove > 120) velocityRef.current = 0;
    else velocityRef.current *= Math.exp(-Math.max(timeSinceMove, 0) / 70);
    dragRef.current = null;
    const stage = stageRef.current;
    if (stage) {
      delete stage.dataset.dragging;
      if (stage.hasPointerCapture(drag.pointerId)) stage.releasePointerCapture(drag.pointerId);
    }
    syncMotionRef.current?.();
  }, []);

  useEffect(() => {
    // A short press can leave the stage before pointer capture begins.
    // Always release it, including when the browser loses focus.
    const release = (event: PointerEvent) => finishDrag(event.pointerId);
    const cancel = (event: PointerEvent) => finishDrag(event.pointerId, true);
    const blur = () => finishDrag(undefined, true);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", blur);
    };
  }, [finishDrag]);

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (compact || event.button !== 0 || !event.isPrimary) return;
    // A new press is a new intent, never the click produced by the last drag.
    suppressClickRef.current = false;
    velocityRef.current = 0;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".orbit-project") : null;
    let anchorIndex = itemRefs.current.findIndex((item) => item === target);
    if (anchorIndex < 0) {
      let nearestDistance = Infinity;
      itemRefs.current.forEach((item, index) => {
        if (!item) return;
        const bounds = item.getBoundingClientRect();
        const distance = Math.hypot(event.clientX - bounds.left - bounds.width / 2, event.clientY - bounds.top - bounds.height / 2);
        if (distance < nearestDistance) { nearestDistance = distance; anchorIndex = index; }
      });
    }
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, anchorIndex: Math.max(anchorIndex, 0), moved: false, lastX: event.clientX, lastY: event.clientY, lastTime: event.timeStamp };
    syncMotionRef.current?.();
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.x;
    const verticalDistance = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.max(Math.abs(distance), Math.abs(verticalDistance)) < 6) return;
      // Let vertical touch gestures scroll the page, even from a project card.
      if (event.pointerType !== "mouse" && Math.abs(verticalDistance) > Math.abs(distance)) {
        finishDrag(event.pointerId, true);
        return;
      }
      if (event.pointerType !== "mouse" && Math.abs(distance) < 6) return;
    }
    if (!drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
      if (document.activeElement instanceof HTMLElement && document.activeElement.closest(".orbit-project")) {
        document.activeElement.blur();
      }
      setActiveId(null);
    }
    event.preventDefault();
    const path = pathRef.current;
    if (!path) return;
    const point = getOrbitPoint(path, progressRef.current + drag.anchorIndex / portfolioProjects.length);
    // Project pointer travel onto the grabbed card's local path direction.
    // One pixel along the path moves the card one pixel, on either side.
    const travel = (event.clientX - drag.lastX) * point.tangentX + (event.clientY - drag.lastY) * point.tangentY;
    const elapsed = Math.max(8, event.timeStamp - drag.lastTime);
    const measuredVelocity = Math.max(-MAX_GLIDE_PIXELS_PER_MS, Math.min(MAX_GLIDE_PIXELS_PER_MS, travel / elapsed));
    const smoothing = 1 - Math.exp(-elapsed / 45);
    velocityRef.current += (measuredVelocity - velocityRef.current) * smoothing;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
    progressRef.current = (progressRef.current + travel / path.length) % 1;
    paintRef.current?.();
  };

  return (
    <section className="project-gallery" aria-label="Selected work and experiments">
      <div className="gallery-toolbar">
        <p>Selected work <span>&amp;</span> experiments <span className="gallery-count">/ {String(portfolioProjects.length).padStart(2, "0")}</span></p>
      </div>

        <div
          ref={stageRef}
          className="orbit-stage"
          style={{ containerType: "size" }}
          data-has-selection={activeId !== null}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={(event) => finishDrag(event.pointerId)}
          onPointerCancel={(event) => finishDrag(event.pointerId, true)}
          onLostPointerCapture={(event) => finishDrag(event.pointerId)}
          onClickCapture={(event) => {
            // Capture the release click on either a card or the empty stage.
            // Keyboard/assistive activation (detail 0) always remains usable.
            if (!suppressClickRef.current || event.detail === 0) return;
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="orbit-monogram" aria-hidden="true"><span>S</span><i>/</i><span>B</span></div>
          <h1 className="orbit-introduction">I design &amp;<br /><em>build software.</em></h1>
          {portfolioProjects.map((project, index) => {
            const initial = getOrbitPoint(INITIAL_PATH, START_PROGRESS + index / portfolioProjects.length);
            return (
              <Link
                key={project.id}
                ref={(element) => { itemRefs.current[index] = element; }}
                className="orbit-project"
                href={"href" in project ? project.href : `/?app=${project.appId}`}
                prefetch={false}
                data-project={project.id}
                data-selected={activeId === project.id}
                aria-label={`${project.title}. ${project.kind}. ${project.action}.`}
                style={{ transform: `translate3d(${Number((initial.x / 12).toFixed(4))}cqw, ${Number((initial.y / 5.7).toFixed(4))}cqh, 0px) translate(-50%, -50%) scale(${initial.scale})`, animationDelay: `${index * 45}ms` }}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && !dragRef.current) { setActiveId(project.id); if ("appId" in project) onPreload(); }
                }}
                onPointerLeave={() => { if (document.activeElement !== itemRefs.current[index]) setActiveId(null); }}
                onFocus={() => { setActiveId(project.id); if ("appId" in project) onPreload(); }}
                onBlur={() => setActiveId(null)}
                onClick={(event) => {
                  if (!("appId" in project) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  onOpenProject(project, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                  if (!direction) return;
                  event.preventDefault();
                  itemRefs.current[(index + direction + portfolioProjects.length) % portfolioProjects.length]?.focus();
                }}
              >
                <span className="orbit-artwork"><ProjectMedia project={project} active={activeId === project.id && !suspended && !reducedMotion} /><span className="orbit-media-label">{project.action} <span aria-hidden="true">↗</span></span></span>
              </Link>
            );
          })}
        </div>

      <div className="gallery-bottom">
        <div className="gallery-selection" aria-live="polite" aria-atomic="true">
          {activeProject ? <><span>{activeProject.kind}</span><p>{activeProject.description}</p></> : <><span>Built by Sam Bai</span><p>A few products, useful tools, and playful detours.</p></>}
        </div>
        <p className="orbit-instruction"><span className="orbit-instruction-desktop">Drag to turn · Select to explore</span><span className="orbit-instruction-touch">{compact ? "Tap a project to explore" : "Swipe to turn · Tap to explore"}</span><span aria-hidden="true">↗</span></p>
      </div>
    </section>
  );
}
