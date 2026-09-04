// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import type { WorkbenchAppId } from "../lib/workbench-system";

type IconName = WorkbenchAppId | "atlas" | "minimize" | "maximize" | "restore" | "close";

const paths: Record<IconName, string> = {
  now: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
  stack: "m3 7 9-4 9 4-9 4z M3 12l9 4 9-4 M3 17l9 4 9-4",
  method: "M4 5h5v5H4z M15 14h5v5h-5z M9 7h9v7 M6 10v7h9",
  scratch: "M14 3H5v18h14v-9 M10 14l2-5 7-7 3 3-7 7z",
  console: "m5 6 5 6-5 6 M13 18h6",
  links: "m10 8 3-3a4 4 0 0 1 6 6l-3 3 M14 16l-3 3a4 4 0 0 1-6-6l3-3 M8 16l8-8",
  pulse: "M3 17h4l3-11 4 14 3-9h4",
  book: "M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h3",
  sandbox: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z M10 6h4 M6 10v4 M18 10v4 M10 18h4",
  agent: "M7 7h10v10H7z M9 3v4 M15 3v4 M9 17v4 M15 17v4 M3 9h4 M3 15h4 M17 9h4 M17 15h4 M10 10h4v4h-4z",
  lab: "M4 12a8 8 0 0 1 16 0 M7 12a5 5 0 0 1 10 0 M10 12a2 2 0 0 1 4 0 M12 12v9 M5 18h14",
  railshift: "M5 3v18 M12 3v18 M19 3v18 M9 13l3-4 3 4",
  vector: "M6 18V4 M6 18h14 M6 18l10-10 M3 7l3-3 3 3 M17 15l3 3-3 3 M12 8h4v4",
  archive: "M3 7V4h7l3 3h8v13H3z M3 10h18",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  control: "M5 3v5 M5 12v9 M12 3v10 M12 17v4 M19 3v2 M19 9v12 M2 8h6v4H2z M9 13h6v4H9z M16 5h6v4h-6z",
  atlas: "M3 4h8v7H3z M15 4h6v12h-6z M3 15h8v5H3z",
  minimize: "M5 17h14",
  maximize: "M5 5h14v14H5z",
  restore: "M8 4h12v12 M4 8h12v12H4z",
  close: "m6 6 12 12 M18 6 6 18",
};

export default function WorkbenchIcon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg className={`workbench-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}
