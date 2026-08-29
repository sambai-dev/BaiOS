// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorScreen({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <title>Unable to render | Sam Bai</title>
      <main className="fallback-screen">
        <p className="fallback-code">500 / Render failed</p>
        <div className="fallback-copy">
          <h1>The Workbench stopped.</h1>
          <p>Retry this view. Previously saved local data stays on this device.</p>
        </div>
        <div className="fallback-actions">
          <button className="fallback-action" type="button" onClick={retry}>
            Try again <span aria-hidden="true">↻</span>
          </button>
          <Link className="fallback-action fallback-action--quiet" href="/">
            Return home <span aria-hidden="true">→</span>
          </Link>
        </div>
      </main>
    </>
  );
}
