import { ImageResponse } from "next/og";

export const alt = "Sam Bai | Founder, Solynth Labs";
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
          background: "#10100f",
          color: "#f1f0e8",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "56px 64px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 19, letterSpacing: "0.08em" }}>SAM BAI</span>
          <span style={{ color: "#98988e", fontSize: 19 }}>HAMILTON, NEW ZEALAND</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.88 }}>
          <span style={{ fontSize: 122, letterSpacing: "-0.06em" }}>Sam is building</span>
          <span style={{ color: "#5666ea", fontSize: 122, letterSpacing: "-0.06em" }}>
            Solynth Labs.
          </span>
        </div>
        <div
          style={{
            borderTop: "1px solid #3a3a36",
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 24,
          }}
        >
          <span style={{ fontSize: 22 }}>SOFTWARE CONSULTATION AND PRODUCTION</span>
          <span style={{ color: "#98988e", fontSize: 18 }}>SAMBAI.DEV</span>
        </div>
      </div>
    ),
    size,
  );
}
