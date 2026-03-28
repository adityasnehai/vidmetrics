import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 9999,
          background: "linear-gradient(180deg, #A855F7 0%, #7C3AED 100%)",
        }}
      />
    </div>,
    size,
  );
}
