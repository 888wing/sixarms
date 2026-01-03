/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base - 深色系
        'void': '#0a0a0b',
        'bg-primary': '#111113',
        'bg-secondary': '#18181b',
        'bg-elevated': '#1f1f23',

        // Border
        'border-subtle': '#27272a',
        'border-default': '#3f3f46',

        // Text
        'text-primary': '#fafafa',
        'text-secondary': '#a1a1aa',
        'text-muted': '#52525b',

        // Accent - 霓虹系
        'accent-cyan': '#22d3ee',
        'accent-green': '#4ade80',
        'accent-amber': '#fbbf24',
        'accent-rose': '#fb7185',
        'accent-violet': '#a78bfa',
      },
      fontFamily: {
        'display': ['JetBrains Mono', 'monospace'],
        'body': ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        'mono': ['Space Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.3)',
        'glow-green': '0 0 20px rgba(74, 222, 128, 0.3)',
        'glow-amber': '0 0 20px rgba(251, 191, 36, 0.3)',
        'glow-rose': '0 0 20px rgba(251, 113, 133, 0.3)',
        'glow-violet': '0 0 20px rgba(167, 139, 250, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite',
        'blink': 'blink 1s infinite',
        'stagger-in': 'stagger-in 0.4s ease-out both',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 211, 238, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(34, 211, 238, 0)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'stagger-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
