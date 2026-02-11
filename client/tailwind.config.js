// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Original Citadel colors (for backward compatibility)
        citadel: {
          gold: '#D4AF37',
          dark: '#1a1a1a',
          cream: '#F5F5DC',
          charcoal: '#2C2C2C',
        },
        // New Luxury palette
        luxury: {
          cream: '#FAF7F2',
          bone: '#F5EFE7',
          champagne: '#E8DCC4',
          gold: '#C9A961',
          darkGold: '#B08D57',
          bronze: '#8B6F3F',
          charcoal: '#1C1B19',
          midnight: '#0F0E0C',
          stone: '#807B73',
          sage: '#5F5D5A',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        heading: ['Playfair Display', 'serif'],
        body: ['Lora', 'serif'],
        sans: ['Montserrat', 'Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      letterSpacing: {
        luxury: '0.15em',
        elegant: '0.1em',
        refined: '0.05em',
      },
    },
  },
  plugins: [],
}