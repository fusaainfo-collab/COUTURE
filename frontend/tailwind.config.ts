import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08090b",
        navy: "#0d1b2a",
        ivory: "#f7f3e9",
        gold: "#d6b25e",
        graphite: "#151923",
        line: "rgba(247, 243, 233, 0.12)"
      },
      boxShadow: {
        premium: "0 18px 60px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;

