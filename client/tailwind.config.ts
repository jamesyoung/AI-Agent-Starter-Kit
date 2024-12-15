/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FFFFFF",
        secondary: "#111111",
        accent: "#333333",
      }
    },
  },
  plugins: [],
} as const; 