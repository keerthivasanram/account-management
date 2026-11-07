/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Design System Palette
        app: {
          bg: '#F7F8FA',
          sidebar: '#FFFFFF',
          panel: '#FFFFFF',
          border: '#E5E7EB',
          borderHover: '#D1D5DB',
        },
        primary: {
          text: '#172B24',
          green: '#166534',
          greenHover: '#14532D',
          greenLight: '#F0FDF4',
          greenBorder: '#BBF7D0',
        },
        secondary: {
          text: '#64748B',
          textHover: '#334155',
        },
        status: {
          success: '#15803D',
          successBg: '#F0FDF4',
          successBorder: '#BBF7D0',
          warning: '#D97706',
          warningBg: '#FFFBEB',
          warningBorder: '#FDE68A',
          error: '#DC2626',
          errorBg: '#FEF2F2',
          errorBorder: '#FECACA',
          info: '#2563EB',
          infoBg: '#EFF6FF',
          infoBorder: '#BFDBFE',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
