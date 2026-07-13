import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      // 1. Python AI Specific API Routes (first priority for /api prefix)
      "/api/score": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/api/roles": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/api/analyze": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      // 2. Python AI General Routes
      "/chat": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/ocr": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/list-docs": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/list-resumes": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/get-resume": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/list-jobs": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/get-doc-path": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/get-doc": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/analyze-resume": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      // 3. Go Backend WebSocket Proxy
      "/ws": {
        target: "ws://127.0.0.1:8080",
        ws: true,
      },
      // 4. Go Backend General Routes
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
});