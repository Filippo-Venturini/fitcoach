/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#080F1C',
          900: '#0D1628',
          800: '#111E35',
          700: '#182844',
          600: '#1F3357',
        },
        gold: {
          300: '#FCD34D',
          400: '#F5B832',
          500: '#F0A800',
          600: '#C98C00',
        },
      },
      fontFamily: {
        heading: ['"Barlow Condensed"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
