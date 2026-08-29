// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <title>Page not found | Sam Bai</title>
      <main className="fallback-screen">
        <p className="fallback-code">404 / No route</p>
        <div className="fallback-copy">
          <h1>Page not found.</h1>
          <p>The address does not match a BaiOS route.</p>
        </div>
        <Link className="fallback-action" href="/">
          Return to sambai.dev <span aria-hidden="true">→</span>
        </Link>
      </main>
    </>
  );
}
