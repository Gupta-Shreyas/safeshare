import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SafeShare",
    short_name: "SafeShare",
    description: "Building trust when it matters most.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#EAE2B7",
    theme_color: "#003049",
    icons: [{ src: "/logo.png", sizes: "any", type: "image/png" }],
  };
}