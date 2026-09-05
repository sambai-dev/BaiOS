// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useRef } from "react";

import type { WorkbenchDeepLink } from "@/app/lib/workbench-deep-link";

import WorkbenchOS from "./WorkbenchOS";

type WorkbenchOverlayProps = {
  deepLink: WorkbenchDeepLink | null;
  onClose: () => void;
  onExitComplete: () => void;
  open: boolean;
  revealOrigin: Readonly<{ x: number; y: number }>;
  time: string;
};

export default function WorkbenchOverlay({
  deepLink,
  onClose,
  onExitComplete,
  open,
  revealOrigin,
  time,
}: WorkbenchOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence custom={revealOrigin} onExitComplete={onExitComplete}>
      {open && (
        <WorkbenchOS
          closeButtonRef={closeButtonRef}
          deepLink={deepLink}
          onClose={onClose}
          prefersReducedMotion={Boolean(prefersReducedMotion)}
          revealOrigin={revealOrigin}
          time={time}
        />
      )}
    </AnimatePresence>
  );
}
