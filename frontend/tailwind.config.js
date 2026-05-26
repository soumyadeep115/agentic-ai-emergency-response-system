/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0d1117',
        panel: '#161b22',
        card: '#21262d',
        hover: '#262c36',
        border: '#30363d',
        muted: '#484f58',
        secondary: '#8b949e',
        primary: '#e6edf3',
        'accent-red': '#f85149',
        'accent-orange': '#d29922',
        'accent-green': '#3fb950',
        'accent-blue': '#58a6ff',
        'accent-cyan': '#39d3c3',
        'accent-purple': '#bc8cff',
        'accent-amber': '#f97316',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-end infinite',
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'march': 'march 1.2s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        march: {
          to: { 'stroke-dashoffset': '-12' },
        },
      },
    },
  },
  plugins: [],
}
