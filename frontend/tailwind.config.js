/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ptcl-green': '#00A651',
        'ptcl-light': '#F0FFF4',
        'terminal-bg': '#0a0a0a',
        'terminal-text': '#00ff41',
        'warning': '#F59E0B',
        'critical': '#F97316',
        'danger': '#EF4444'
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'mono': ['Courier New', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
