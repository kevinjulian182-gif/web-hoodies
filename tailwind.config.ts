import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Values come from CSS custom properties (see globals.css for
        // defaults, layout.tsx for the admin-configurable override) instead
        // of static hex, so Admin > Contenido can retint the whole site at
        // runtime without a rebuild. `<alpha-value>` keeps opacity utilities
        // like `bg-cream-50/90` working.
        cream: {
          50: 'rgb(var(--color-cream-50) / <alpha-value>)',
          100: 'rgb(var(--color-cream-100) / <alpha-value>)',
          200: 'rgb(var(--color-cream-200) / <alpha-value>)',
          300: 'rgb(var(--color-cream-300) / <alpha-value>)',
        },
        coffee: {
          400: 'rgb(var(--color-coffee-400) / <alpha-value>)',
          500: 'rgb(var(--color-coffee-500) / <alpha-value>)',
          600: 'rgb(var(--color-coffee-600) / <alpha-value>)',
          700: 'rgb(var(--color-coffee-700) / <alpha-value>)',
          800: 'rgb(var(--color-coffee-800) / <alpha-value>)',
          900: 'rgb(var(--color-coffee-900) / <alpha-value>)',
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
