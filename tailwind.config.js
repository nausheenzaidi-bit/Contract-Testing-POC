/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pact: {
          primary: '#00d9c0',
          secondary: '#5f5fff',
          dark: '#1a1a2e',
          light: '#f8f9fa'
        }
      }
    },
  },
  plugins: [],
}
