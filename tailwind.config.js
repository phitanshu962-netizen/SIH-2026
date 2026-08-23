/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warmBg: '#FFFCF8',
        brandSurface: '#FFFFFF',
        brandOrange: {
          DEFAULT: '#F28C52',
          dark: '#E9783F',
          light: '#FFF1E8',
          border: '#F4C4A5'
        },
        brandCharcoal: {
          DEFAULT: '#242424',
          muted: '#686868'
        },
        brandBlack: '#171717',
        brandBorder: '#E8E2DC',
        brandSuccess: '#4F7D5A',
        brandWarning: '#C88732',
        brandError: '#B85C52'
      },
      fontFamily: {
        sans: ["'Inter'", "'IBM Plex Sans'", "'Plus Jakarta Sans'", "sans-serif"],
        hindi: ["'Mukta'", "'Hind'", "sans-serif"]
      },
      boxShadow: {
        subtle: '0 2px 12px rgba(40, 30, 20, 0.05)',
        hover: '0 4px 20px rgba(40, 30, 20, 0.08)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
