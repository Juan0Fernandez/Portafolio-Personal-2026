/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class', // ¡ESTO ES CRUCIAL PARA QUE FUNCIONEN LOS PREFIJOS dark: !
  theme: {
    extend: {
      colors: {
        'ciber-green': '#00ff41',
        'ciber-purple': '#bc13fe',
        'dark-bg': '#030303',
      },
    },
  },
  plugins: [],
}