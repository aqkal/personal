import { ImageResponse } from "next/og";
import { profile } from "@content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Explorable 3D portfolio";

/** Generated at build time; served as a static PNG on both hosts. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(180deg, #070b14 0%, #0d1b3a 100%)",
          color: "#dbe4f5",
          fontSize: 44,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: "#4ef08a",
            fontSize: 30,
            letterSpacing: 6,
          }}
        >
          &gt;&gt; CHOOSE YOUR INTERFACE &lt;&lt;
        </div>
        <div style={{ marginTop: 28, fontSize: 76, fontWeight: 700 }}>
          {profile.name}
        </div>
        <div style={{ marginTop: 18, color: "#8b9bb8", fontSize: 34 }}>
          {profile.tagline}
        </div>
        <div
          style={{
            marginTop: 46,
            display: "flex",
            gap: 26,
            fontSize: 26,
            color: "#53d8ff",
          }}
        >
          <span>walkable 3D Brisbane campus</span>
          <span>+</span>
          <span>&gt;_ UQ-OS terminal</span>
        </div>
      </div>
    ),
    size,
  );
}
