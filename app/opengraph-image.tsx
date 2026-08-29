// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { ImageResponse } from "next/og";

export const alt = "Sam Bai | Founder & Product Engineer, Solynth Labs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#11110f",
          color: "#f0efe8",
          display: "flex",
          flexDirection: "column",
          // No fontFamily declared on purpose: the Satori runtime cannot
          // resolve system fonts like Arial, and naming one silently falls
          // back to @vercel/og's bundled face while implying otherwise.
          height: "100%",
          justifyContent: "space-between",
          padding: "56px 64px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 19, letterSpacing: "0.08em" }}>SAM BAI</span>
          <span style={{ color: "#bbb9b0", fontSize: 19 }}>
            HAMILTON, NEW ZEALAND
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.88 }}>
          <span style={{ fontSize: 122, letterSpacing: "-0.06em" }}>
            Sam designs and
          </span>
          <div style={{ display: "flex", fontSize: 122, letterSpacing: "-0.06em" }}>
            <span>builds software</span>
            <span style={{ color: "#4c5ce5" }}>.</span>
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(240, 239, 232, 0.24)",
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 24,
          }}
        >
          <span style={{ fontSize: 22 }}>
            FOUNDER &amp; PRODUCT ENGINEER, SOLYNTH LABS.
          </span>
          <span style={{ color: "#bbb9b0", fontSize: 18 }}>SAMBAI.DEV</span>
        </div>
      </div>
    ),
    size,
  );
}
