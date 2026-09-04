// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Accept the host spelling used by preview runners while preserving the
// standard Next.js development CLI for local development.
const args = process.argv.slice(2)
  .filter((argument) => argument !== "--strictPort")
  .map((argument) => argument === "--host" ? "--hostname" : argument);

const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [next, "dev", ...args], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
