/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ??$$$ custom colors matching Velxio theme
        velxio: {
          bg: '#121214',
          panel: '#1e1e24',
          border: '#2e303c',
          input: '#151518',
          accent: '#007acc',
          accentHover: '#0062a3',
          textMuted: '#9e9eb0',
        }
      }
    },
  },
  plugins: [],
};
