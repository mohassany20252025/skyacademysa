/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'sans-serif'],
        quran: ['Amiri', 'Traditional Arabic', 'serif'],
      },
      colors: {
        navy: {
          950: '#060B19',
          900: '#0A1128',
          800: '#111C38',
          700: '#1A2B52',
        }
      }
    },
  },
  plugins: [],
}
