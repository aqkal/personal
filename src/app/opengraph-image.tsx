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
            color: "#8b9bb8",
            fontSize: 26,
            letterSpacing: 10,
          }}
        >
          PORTFOLIO · BRISBANE, AUSTRALIA
        </div>
        <div style={{ marginTop: 24, fontSize: 84, fontWeight: 700 }}>
          {profile.name}
        </div>
        <div
          style={{
            marginTop: 20,
            display: "flex",
            gap: 16,
            fontSize: 36,
            color: "#dbe4f5",
          }}
        >
          <span>software engineer</span>
          <span style={{ color: "#a78bfa" }}>×</span>
          <span>world builder</span>
        </div>
        <div
          style={{
            marginTop: 44,
            display: "flex",
            gap: 26,
            fontSize: 25,
            color: "#5fd4c8",
          }}
        >
          <span>walkable 3D Brisbane campus</span>
          <span>+</span>
          <span>spotlight portfolio</span>
        </div>
      </div>
    ),
    size,
  );
}
