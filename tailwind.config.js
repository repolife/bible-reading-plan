const withMT = require("@material-tailwind/react/utils/withMT");
const { default: daisyui } = require("daisyui");

module.exports = withMT({
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}",
    "node_modules/@material-tailwind/react/theme/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
    container: {
      center: true,
    },
  },
  plugins: [require("@tailwindcss/typography"), require("daisyui"),     require('tailwindcss-debug-screens'),
],
  daisyui: {
    themes: ["dim"],
  },
});
