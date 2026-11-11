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

  // Expose only NODE_ENV. Passing the whole process.env would let any
  // reference inline server-only secrets (e.g. SUPABASE_SERVICE_ROLE_KEY)
  // from the Netlify build environment into the public bundle.
  define: {
    "process.env": JSON.stringify({ NODE_ENV: process.env.NODE_ENV }),
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
    dedupe: ['react', 'react-dom'],
    alias: {
      shared: path.resolve(__dirname, "src/components/Shared"),
      data: path.resolve(__dirname, "data"),
      "@components": path.resolve(__dirname, "src/components"),
      "@store": path.resolve(__dirname, "src/store"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@": path.resolve(__dirname, "src"),
      "react/compiler-runtime": path.resolve(__dirname, "src/compiler-runtime-shim.js"),
    },
  },

  build: {
    sourcemap: process.env.NODE_ENV === 'production',
  },

  optimizeDeps: {
    exclude: [],
  },
});
