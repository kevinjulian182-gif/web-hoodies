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
          400: '#A68E76',
          500: '#8F725C',
          600: '#755848',
          700: '#614736',
          800: '#4F3A2A',
          900: '#3D2B1F',
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
