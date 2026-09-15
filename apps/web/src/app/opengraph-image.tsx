import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Plugin Project Manager";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
          gap: 36,
        }}
      >
        <img src={logoSrc} width={552} height={200} alt="Plugin" />
        <div
          style={{
            display: "flex",
            fontSize: 42,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#f4f6ff",
          }}
        >
          Project Manager
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#9aa3b5",
            maxWidth: 720,
            textAlign: "center",
            justifyContent: "center",
          }}
        >
          Move work through teams with readable IDs and file handoffs.
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
