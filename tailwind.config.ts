import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07110f",
        panel: "#0d1916",
        panel2: "#12221d",
        line: "#20352e",
        brand: "#3ddc67"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(61,220,103,.18), 0 18px 50px rgba(0,0,0,.25)"
      }
    }
  },
  plugins: []
};

export default config;
