/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        chalk: '#F2F5F1', // app background: cool, green-tinted paper
        surface: '#FFFFFF',
        lane: '#E5EAE5', // Kanban column track
        ink: { DEFAULT: '#14201C', soft: '#4B5A54', faint: '#6F7F77' },
        line: { DEFAULT: '#D8DFD9', strong: '#B6C2BA' },
        spruce: { DEFAULT: '#1F6B52', dark: '#154D3A', tint: '#DDEBE4' },
        forest: { DEFAULT: '#10302A', light: '#1B4A40' }, // sidebar
        signal: { critical: '#C23A2E', high: '#D77A1E', medium: '#B8941F', low: '#7F9189' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '6px',
      },
      boxShadow: {
        lift: '0 6px 18px -6px rgba(16, 48, 42, 0.35)',
        panel: '0 20px 50px -12px rgba(16, 48, 42, 0.45)',
      },
    },
  },
  plugins: [],
};
