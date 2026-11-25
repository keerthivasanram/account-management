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
        // Brand teal-green, sampled from the locked Operations mockup (active nav = #06725D)
        brand: {
          50: '#EDFAF6',
          100: '#D2F3E9',
          200: '#A6E6D3',
          300: '#6FD2B7',
          400: '#2FB596',
          500: '#0A967A',
          600: '#028266',
          700: '#06725D',
          800: '#085D4C',
          900: '#084B3E',
        },
        // Sidebar shell: deep teal-navy from the mockup
        shell: {
          900: '#0A252E',
          800: '#0F2F39',
          700: '#163B46',
          600: '#2D424B',
          muted: '#8B9CA3',
          text: '#E7E9EB',
          accent: '#05B7B4',
        },
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
        'soft': '0 1px 2px 0 rgba(15, 30, 53, 0.04), 0 4px 12px -2px rgba(15, 30, 53, 0.06)',
        'lift': '0 2px 4px 0 rgba(15, 30, 53, 0.05), 0 12px 24px -6px rgba(15, 30, 53, 0.12)',
        'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
