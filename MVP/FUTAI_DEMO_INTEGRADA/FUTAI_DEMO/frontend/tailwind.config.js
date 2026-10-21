/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: { 950: '#070707', 900: '#0a0a0a', 800: '#11141a', 700: '#171b23', 600: '#1f2430' },
        neon: { DEFAULT: '#00e676', soft: '#10b981' },
        tech: { DEFAULT: '#00d2ff' },
        alert: { DEFAULT: '#ff4d4f' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
