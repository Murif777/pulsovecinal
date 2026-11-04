/** @type {import('tailwindcss').Config} */
const brand = {
  50: '#eef3fb',
  100: '#d9e5f6',
  200: '#b4cbed',
  300: '#84a8de',
  400: '#5580cb',
  500: '#3862b5',
  600: '#2b4d97',
  700: '#243f7a',
  800: '#1f3563',
  900: '#16264a',
  950: '#0e1a33',
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // `teal` queda remapeado a la marca (azul tinta) y `slate` a una
        // escala neutra calida tipo papel/tinta: re-tematiza todo el front.
        teal: brand,
        brand,
        slate: {
          50: '#f8f6f1',
          100: '#f0ede4',
          200: '#e3ded0',
          300: '#cdc7b6',
          400: '#9f9989',
          500: '#757062',
          600: '#57534a',
          700: '#3e3b35',
          800: '#282621',
          900: '#171512',
          950: '#0d0c0a',
        },
        paper: '#faf8f3',
        pulse: { 400: '#f07a63', 500: '#e8553d', 600: '#cc4029', 700: '#b23520' },
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgb(23 21 18 / 0.04), 0 8px 24px -12px rgb(23 21 18 / 0.18)',
        lift: '0 2px 0 rgb(23 21 18 / 0.04), 0 20px 40px -16px rgb(23 21 18 / 0.28)',
      },
    },
  },
  plugins: [],
}
