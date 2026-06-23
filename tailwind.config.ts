import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Phase palette — the lifecycle of a wave
        emerging: "#38bdf8",   // sky — early, accumulation
        momentum: "#22c55e",   // green — markup, ride it
        climax: "#f59e0b",     // amber — euphoria, caution
        distribution: "#ef4444", // red — topping, exit
        decline: "#71717a",    // zinc — markdown, avoid
        ink: {
          950: "#070a12",
          900: "#0b1020",
          850: "#0f1730",
          800: "#141d3a",
          700: "#1f2a4d",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
