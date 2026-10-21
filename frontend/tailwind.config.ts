import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{vue,js,ts,jsx,tsx}',
    './components/**/*.{vue,js,ts,jsx,tsx}',
    './pages/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        factory: {
          bg: '#0a0e17',
          panel: '#111827',
          card: '#161f30',
          border: '#1f293d',
          running: '#10b981',
          idle: '#f59e0b',
          down: '#ef4444',
          maint: '#3b82f6',
          cyan: '#06b6d4'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config
