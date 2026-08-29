// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Unable to load | Sam Bai</title>
      </head>
      <body
        style={{
          alignItems: "flex-start",
          background: "#11110f",
          color: "#f0efe8",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, sans-serif",
          justifyContent: "space-between",
          margin: 0,
          minHeight: "100vh",
          padding: "clamp(24px, 6vw, 80px)",
        }}
      >
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          500 / Root failed
        </p>
        <div>
          <h1
            style={{
              fontSize: "clamp(48px, 9vw, 128px)",
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
              margin: 0,
              maxWidth: "10ch",
            }}
          >
            BaiOS could not start.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, maxWidth: "42ch" }}>
            Retry the page. Previously saved local data stays on this device.
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          style={{
            background: "#4c5ce5",
            border: "1px solid #59df79",
            borderRadius: 0,
            color: "white",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 13,
            minHeight: 44,
            padding: "12px 16px",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
