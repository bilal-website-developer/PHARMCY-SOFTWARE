/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pharma: {
          primary: 'var(--color-primary)',   // #15803D
          accent: 'var(--color-accent)',     // #22C55E
          surface: 'var(--color-surface)',   // #F0FDF4
          white: 'var(--color-white)',       // #FFFFFF
          danger: 'var(--color-danger)',     // #DC2626
          text: 'var(--color-text)',         // #14532D
          muted: 'var(--color-muted)',       // #6B8F7B
          warning: 'var(--color-warning)',   // #F59E0B
          sidebar: 'var(--color-sidebar)',  // #14532D
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius-default)',
        pharma: 'var(--radius-default)',
        card: 'var(--radius-default)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ["'Noto Nastaliq Urdu'", 'serif'],
      },
      boxShadow: {
        'pharma-sm': '0 1px 3px 0 rgba(20, 83, 45, 0.05)',
        'pharma-md': '0 4px 6px -1px rgba(20, 83, 45, 0.08), 0 2px 4px -2px rgba(20, 83, 45, 0.06)',
        'pharma-lg': '0 10px 15px -3px rgba(20, 83, 45, 0.1), 0 4px 6px -4px rgba(20, 83, 45, 0.05)',
      },
    },
  },
  plugins: [],
}
