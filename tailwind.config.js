import { mtConfig } from "@material-tailwind/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@material-tailwind/react/**/*.{js,ts,jsx,tsx}",
    "./node_modules/daisyui/**/*.{js,ts}",
    "node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}",
    "node_modules/@material-tailwind/react/theme/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
    container: {
      center: true,
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-debug-screens"),
    mtConfig,
  ],
  daisyui: {
    themes: ["dim"],
  },
};
