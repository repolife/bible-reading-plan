/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    minWidth: "w-screen",
    lineHeight: 1.5,

    fontFamily: { sans: ["Inter", "system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"] },
    extend: {},
  },
  plugins: [],
};
