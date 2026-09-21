import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCFA',
          100: '#F8F4EE',
          200: '#F1EADD',
          300: '#E5DACA',
        },
        coffee: {
          400: '#8A7864',
          500: '#6B5847',
          600: '#4A3B2F',
          700: '#3A2E24',
          800: '#2A2119',
          900: '#1C1611',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Helvetica Neue', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'loading-bar': 'loading-bar 1.1s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'loading-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
    },
  },
  // Without this, every `hover:` utility compiles to plain `:hover`, which
  // touch browsers fake on tap and never clear until the user taps
  // elsewhere — buttons and cards stay visually "stuck" after a tap.
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};

export default config;
