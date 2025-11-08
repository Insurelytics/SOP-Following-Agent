import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        'shimmer-text': 'shimmer-text 2s ease-in-out infinite',
      },
      keyframes: {
        'shimmer-text': {
          '0%': { backgroundPosition: '300% center' },
          '50%': { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '-300% center' },
        },
      },
    },
  },
  plugins: [],
};
export default config;

