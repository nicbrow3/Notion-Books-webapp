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
      },
      animation: {
        'in': 'fadeIn 0.7s ease-in-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-from-bottom': 'slideInFromBottom 0.6s ease-out',
        'slide-in-from-top': 'slideInFromTop 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromBottom: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(16px) scale(0.95)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          },
        },
        slideInFromTop: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(-16px) scale(0.95)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          },
        },
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 