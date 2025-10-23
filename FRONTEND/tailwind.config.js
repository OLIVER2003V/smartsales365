/** @type {import('tailwindcss').Config} */
module.exports = {
  // content ya no es necesario en v4, pero no hace daño:
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'smart-primary': '#007bff',
        'smart-error': '#dc3545',
      },
    },
  },
  plugins: [],
}
