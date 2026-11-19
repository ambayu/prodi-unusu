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
        // Satu keluarga huruf untuk seluruh situs: UI dan judul.
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        // Judul memakai Montserrat agar terasa tegas tanpa menambah keluarga huruf body.
        heading: ['"Montserrat"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
