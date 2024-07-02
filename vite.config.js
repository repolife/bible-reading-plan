import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  define: {
    "process.env": process.env,
  },
  server: {
    port: 5174,
    host: true,
    strictPort: true,
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
    },
  },
});
