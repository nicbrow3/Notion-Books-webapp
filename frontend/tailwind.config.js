/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        notion: {
          50: '#f7f6f3',
          100: '#efede7',
          200: '#ddd9ce',
          300: '#c8c1b2',
          400: '#b1a594',
          500: '#9c8e7a',
          600: '#8b7d68',
          700: '#746a57',
          800: '#5e564a',
          900: '#4d463e',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 