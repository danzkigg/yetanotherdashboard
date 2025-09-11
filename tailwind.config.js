/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light mode
        background: "#f8f9fa",
        card: "#ffffff",
        tierciarylight: "#fafafa",
        main: "#484848",
        secondary: "#555555",
        accent: "#7986cb",

        // Dark mode
        darkBg: "#151519",
        tierciary: "#2c2c30",
        secondaryBg: "#17171c",
        mainDark: "#b4b4bf",
        secondaryDark: "#767684",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
