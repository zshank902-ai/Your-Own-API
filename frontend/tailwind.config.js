/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0F",
        card: "rgba(255, 255, 255, 0.03)",
        cardBorder: "rgba(255, 255, 255, 0.08)",
        primary: "#0EA5E9",
        accent: "#8B5CF6",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
