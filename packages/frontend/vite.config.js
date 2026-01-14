import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/",

  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      include: /\.(jsx|tsx)$/,
    }),
    // Only enable Sentry plugin in production builds
    ...(process.env.NODE_ENV === 'production' ? [
      sentryVitePlugin({
        org: "david-vargas",
        project: "javascript-react",
      })
    ] : []),
  ],

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
      shared: path.resolve(__dirname, "src/components/Shared"),
      data: path.resolve(__dirname, "data"),
      "@components": path.resolve(__dirname, "src/components"),
      "@store": path.resolve(__dirname, "src/store"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    sourcemap: process.env.NODE_ENV === 'production',
  },
  
  // Suppress source map warnings in development
  optimizeDeps: {
    exclude: [],
  },
});
