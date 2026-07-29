import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Creator Studio",
    short_name: "Creator",
    description:
      "Rencanakan, jadwalkan, dan ukur performa konten kamu dalam satu tempat.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#4f46e5",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
