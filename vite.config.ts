import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/rpc": {
        target: "http://127.0.0.1:8545",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, ""),
      },
      "/espn-api": {
        target: "https://site.web.api.espn.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn-api/, ""),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/rpc": {
        target: "http://127.0.0.1:8545",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, ""),
      },
      "/espn-api": {
        target: "https://site.web.api.espn.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn-api/, ""),
      },
    },
  },
});
