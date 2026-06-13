/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette JennyyL : koala lavande + dégradé violet → rose
        jenny: {
          DEFAULT: "#a78bee", // lavande, couleur d'accent principale
          light: "#c9b6f7",
          dark: "#7c5fd3",
          pink: "#ec9bd6",
          deep: "#140f24", // fond nocturne
          surface: "#211a38", // cartes
          line: "#332a52", // bordures discrètes
        },
      },
    },
  },
  plugins: [],
};
