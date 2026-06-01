import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "KYFAN Financial CRM",
        short_name: "KYFAN CRM",
        description: "Quản lý data khách hàng tài chính KYFAN",
        theme_color: "#0f766e",
        background_color: "#f5fbfa",
        display: "standalone",
        start_url: "/financial-crm/",
        icons: [
          {
            src: "/financial-crm/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/financial-crm/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  base: "/financial-crm/",
});