// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

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
        <form action="/">
          <button className="fallback-action" type="submit">
            Return to sambai.dev <span aria-hidden="true">→</span>
          </button>
        </form>
      </main>
    </>
  );
}
