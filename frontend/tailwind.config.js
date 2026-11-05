/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f5',
          100: '#fbe8ec',
          200: '#f8d5dc',
          300: '#f3b4c1',
          400: '#ea869c',
          500: '#dd5b77',
          600: '#c83b58',
          700: '#a82c44',
          800: '#8c263b',
          900: '#762436',
          950: '#430f1b',
        },
        instagram: {
          pink: '#E1306C',
          purple: '#833AB4',
          orange: '#F77737',
          yellow: '#FCAF45',
          blue: '#405DE6'
        }
      }
    },
  },
  plugins: [],
}
