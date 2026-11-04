/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        'row-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%, 60%': { transform: 'translate(-6px)' },
          '40%, 80%': { transform: 'translate(6px)' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'bounce-subtle': 'bounce-subtle .3s ease-out',
        'fade-in': 'fade-in .2s ease-out',
        'pop-in': 'pop-in .25s ease-out',
        'row-in': 'row-in .22s ease-out',
        shake: 'shake .36s ease-in-out',
        'sheet-up': 'sheet-up .25s cubic-bezier(.32,.72,0,1)',
      },
    },
  },
  plugins: [],
};
