/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        brand: '#f96b15',
        bgLight: '#fdfaf5',
        textDark: '#1a202c',
        textGray: '#5a6372'
      }
    },
  },
  plugins: [],
}