import type { Config } from "tailwindcss";

// Inspire Homes LS8 brand colours
// Primary lime green: #8DC63F  |  Dark navy sidebar: #141422
const inspireGreen = {
  '50':  '#f4fbea',
  '100': '#e6f5ce',
  '200': '#cceb9e',
  '300': '#aede67',
  '400': '#9dd448',
  '500': '#8DC63F',
  '600': '#74a832',
  '700': '#8DC63F',   // brand primary lime green — main accent
  '800': '#5c8827',   // darker shade for hover states
  '900': '#1e1e38',   // dark navy — lighter sidebar tone
  '950': '#141422',   // darkest navy — main sidebar background
}

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Override purple → Inspire brand colours so all existing
        // purple-* classes throughout the codebase adopt the brand palette
        // without any per-file changes.
        purple: inspireGreen,
        // Override indigo (used in Button default variant + form focus rings)
        indigo: {
          ...inspireGreen,
          '600': '#8DC63F',
          '700': '#5c8827',
        },
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
