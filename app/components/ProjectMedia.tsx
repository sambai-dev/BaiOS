// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioProject } from "@/app/lib/portfolio-projects";
import ProjectThumbnail from "./ProjectThumbnail";

const previews: Record<string, string> = {
  railshift: "/portfolio-media/railshift-preview.webm",
  subsurface: "/portfolio-media/subsurface-preview.webm",
};

export default function ProjectMedia({ project, active = false }: {
  project: PortfolioProject; active?: boolean;
}) {
  const [allowVideo, setAllowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 621px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const sync = () => setAllowVideo(query.matches && !connection?.saveData);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const currentVideo = videoRef.current;
    const syncPlayback = () => {
      const video = videoRef.current;
      if (!video) return;
      if (!document.hidden && active && allowVideo) void video.play().catch(() => {});
      else video.pause();
    };
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => { document.removeEventListener("visibilitychange", syncPlayback); currentVideo?.pause(); };
  }, [active, allowVideo]);

  return (
    <>
      <ProjectThumbnail id={project.id} title={project.title} subtitle={project.kind} gameCover={"cover" in project ? project.cover : undefined} />
      {active && allowVideo && previews[project.id] && (
        <video ref={videoRef} key={project.id} src={previews[project.id]} loop muted playsInline preload="none" aria-hidden="true" />
      )}
    </>
  );
}
