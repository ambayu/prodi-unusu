/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palet resmi portal: biru tua untuk struktur, kuning emas untuk aksen.
        brand: {
          DEFAULT: '#1e3a8a',
          dark: '#172f6e',
          light: '#e8eefb',
        },
        accent: {
          DEFAULT: '#fbbf24',
          dark: '#f59e0b',
          light: '#fef3c7',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
