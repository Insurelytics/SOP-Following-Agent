import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

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
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        background: "var(--background)",
        "background-secondary": "var(--background-secondary)",
        "background-tertiary": "var(--background-tertiary)",
        foreground: "var(--foreground)",
        "foreground-muted": "var(--foreground-muted)",
        "foreground-muted-hover": "var(--foreground-muted-hover)",
        border: "var(--border)",
        input: "var(--input)",
        "input-border": "var(--input-border)",
        "input-focus": "var(--input-focus)",
        "message-user-bg": "var(--message-user-bg)",
        "message-assistant-text": "var(--message-assistant-text)",
        "sidebar-bg": "var(--sidebar-bg)",
        "button-bg": "var(--button-bg)",
        "button-hover-bg": "var(--button-hover-bg)",
        action: "var(--action-color)",
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
  plugins: [typography],
};
export default config;

