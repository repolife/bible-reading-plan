
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", 
    "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@material-tailwind/react/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        brand: {
          50: "rgb(52, 28, 0)",
          100: "rgb(63, 34, 0)",
          200: "rgb(74, 41, 0)",
          300: "rgb(87, 51, 0)",
          400: "rgb(105, 63, 5)",
          500: "rgb(130, 78, 0)",
          600: "rgb(255, 178, 36)",
          700: "rgb(255, 203, 71)",
          800: "rgb(241, 161, 13)",
          900: "rgb(254, 243, 221)",
        },
        neutral: {
          0: "rgb(3, 7, 18)",
          50: "rgb(17, 24, 39)",
          100: "rgb(31, 41, 55)",
          200: "rgb(55, 65, 81)",
          300: "rgb(75, 85, 99)",
          400: "rgb(107, 114, 128)",
          500: "rgb(156, 163, 175)",
          600: "rgb(209, 213, 219)",
          700: "rgb(229, 231, 235)",
          800: "rgb(243, 244, 246)",
          900: "rgb(249, 250, 251)",
          950: "rgb(255, 255, 255)",
        },
        error: {
          50: "rgb(58, 24, 47)",
          100: "rgb(69, 26, 55)",
          200: "rgb(80, 27, 63)",
          300: "rgb(96, 29, 72)",
          400: "rgb(122, 29, 90)",
          500: "rgb(167, 24, 115)",
          600: "rgb(214, 64, 159)",
          700: "rgb(227, 75, 169)",
          800: "rgb(246, 92, 182)",
          900: "rgb(254, 235, 247)",
        },
        warning: {
          50: "rgb(44, 33, 0)",
          100: "rgb(53, 40, 0)",
          200: "rgb(62, 48, 0)",
          300: "rgb(73, 60, 0)",
          400: "rgb(89, 74, 5)",
          500: "rgb(112, 94, 0)",
          600: "rgb(245, 217, 10)",
          700: "rgb(255, 239, 92)",
          800: "rgb(240, 192, 0)",
          900: "rgb(255, 250, 209)",
        },
        success: {
          50: "rgb(15, 41, 30)",
          100: "rgb(17, 49, 35)",
          200: "rgb(19, 57, 41)",
          300: "rgb(22, 68, 48)",
          400: "rgb(27, 84, 58)",
          500: "rgb(35, 110, 74)",
          600: "rgb(48, 164, 108)",
          700: "rgb(60, 177, 121)",
          800: "rgb(76, 195, 138)",
          900: "rgb(229, 251, 235)",
        },
        "brand-primary": "rgb(37, 99, 235)",
        "default-font": "rgb(249, 250, 251)",
        "subtext-color": "rgb(156, 163, 175)",
        "neutral-border": "rgb(55, 65, 81)",
        black: "rgb(3, 7, 18)",
        "default-background": "rgb(3, 7, 18)",
      },
      fontSize: {
        caption: [
          "12px",
          {
            lineHeight: "16px",
            fontWeight: "400",
            letterSpacing: "0em",
          },
        ],
        "caption-bold": [
          "12px",
          {
            lineHeight: "16px",
            fontWeight: "500",
            letterSpacing: "0em",
          },
        ],
        body: [
          "14px",
          {
            lineHeight: "20px",
            fontWeight: "400",
            letterSpacing: "0em",
          },
        ],
        "body-bold": [
          "14px",
          {
            lineHeight: "20px",
            fontWeight: "500",
            letterSpacing: "0em",
          },
        ],
        "heading-3": [
          "16px",
          {
            lineHeight: "20px",
            fontWeight: "600",
            letterSpacing: "0em",
          },
        ],
        "heading-2": [
          "20px",
          {
            lineHeight: "24px",
            fontWeight: "600",
            letterSpacing: "0em",
          },
        ],
        "heading-1": [
          "30px",
          {
            lineHeight: "36px",
            fontWeight: "600",
            letterSpacing: "0em",
          },
        ],
        "monospace-body": [
          "14px",
          {
            lineHeight: "20px",
            fontWeight: "400",
            letterSpacing: "0em",
          },
        ],
      },
      fontFamily: {
        caption: '"IBM Plex Mono"',
        "caption-bold": '"IBM Plex Mono"',
        body: '"IBM Plex Mono"',
        "body-bold": '"IBM Plex Mono"',
        "heading-3": '"IBM Plex Mono"',
        "heading-2": '"IBM Plex Mono"',
        "heading-1": '"IBM Plex Mono"',
        "monospace-body": "monospace",
      },
      boxShadow: {
        sm: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
        default: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
        md: "0px 4px 16px -2px rgba(0, 0, 0, 0.08), 0px 2px 4px -1px rgba(0, 0, 0, 0.08)",
        lg: "0px 12px 32px -4px rgba(0, 0, 0, 0.08), 0px 4px 8px -2px rgba(0, 0, 0, 0.08)",
        overlay:
          "0px 12px 32px -4px rgba(0, 0, 0, 0.08), 0px 4px 8px -2px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        sm: "0px",
        md: "0px",
        DEFAULT: "0px",
        lg: "0px",
        full: "9999px",
      },
      container: {
        padding: {
          DEFAULT: "16px",
          sm: "calc((100vw + 16px - 640px) / 2)",
          md: "calc((100vw + 16px - 768px) / 2)",
          lg: "calc((100vw + 16px - 1024px) / 2)",
          xl: "calc((100vw + 16px - 1280px) / 2)",
          "2xl": "calc((100vw + 16px - 1536px) / 2)",
        },
      },
      spacing: {
        112: "28rem",
        144: "36rem",
        192: "48rem",
        256: "64rem",
        320: "80rem",
      },
      screens: {
        mobile: {
          max: "767px",
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-debug-screens"),
  ],
  corePlugins: {
    preflight: true,
  },
};
