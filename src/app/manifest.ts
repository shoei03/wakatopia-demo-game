import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "わかとぴあ | 野菜でそだつ相棒",
    short_name: "わかとぴあ",
    description:
      "食事の写真を記録すると、野菜のバランスでキャラクターが成長する育成ゲーム",
    start_url: "/home",
    display: "standalone",
    lang: "ja",
    background_color: "#F3F9F0",
    theme_color: "#8ED081",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
