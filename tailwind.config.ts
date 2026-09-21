import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FBF6EC',
          100: '#F5EDDD',
          200: '#ECE0C8',
          300: '#DEC9A8',
        },
        coffee: {
          400: '#9C8468',
          500: '#83694F',
          600: '#6B5140',
          700: '#573F2F',
          800: '#453023',
          900: '#362519',
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
