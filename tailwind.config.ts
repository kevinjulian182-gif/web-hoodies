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
        },
        coffee: {
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
    },
  },
  plugins: [],
};

export default config;
