/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          subtle: 'var(--bg-subtle)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        primary: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          coral: 'var(--accent-coral)',
        },
        semantic: {
          accept: 'var(--color-accept)',
          reject: 'var(--color-reject)',
          warn: 'var(--color-warn)',
          info: 'var(--color-info)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans Arabic', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Space Grotesk', 'Cairo', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        arabic: ['IBM Plex Sans Arabic', 'Cairo', 'sans-serif']
      },
      borderRadius: {
        'card': '14px',
        'subtle': '10px',
      },
      boxShadow: {
        'glow-accent': '0 0 25px -5px rgba(245, 158, 11, 0.25)',
        'glow-accept': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
        'glow-reject': '0 0 25px -5px rgba(239, 68, 68, 0.25)',
        'surface': '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
      }
    },
  },
  plugins: [],
}
