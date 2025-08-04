import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/",

  plugins: [react(), sentryVitePlugin({
    org: "david-vargas",
    project: "javascript-react"
  })],

  define: {
    "process.env": process.env,
  },

  server: {
    port: 5174,
    host: true,
    strictPort: false,
    watch: {
      usePolling: true,
    },
  },

  preview: {
    port: 5714,
    strictPort: true,
    host: true,
  },

  resolve: {
    alias: {
      shared: path.resolve(__dirname, "src/Components/Shared"),
      data: path.resolve(__dirname, "data"),
      components: path.resolve(__dirname, "src/Components"),
      "@store": path.resolve(__dirname, "src/store"),
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    sourcemap: true
  }
});