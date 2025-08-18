
import { mtConfig } from "@material-tailwind/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", 
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@material-tailwind/react/**/*.{js,ts,jsx,tsx}"
  ],

  plugins: [
    mtConfig({
      colors: {
        primary: {
          default: "#0e9496",
          dark: "#0b7678",
          light: "#9fd4d5",
          foreground: "#e7f4f5"
        }
      },
      darkColors: {
        primary: {
          default: "#0e9496",
          dark: "#031e1e",
          light: "#9fd4d5",
          foreground: "#e7f4f5",
        },
      },
  
    }),
    require("@tailwindcss/typography"),
    require("tailwindcss-debug-screens"),
  ],
  corePlugins: {
    preflight: true,
  },
};
