/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
        colors: {
            "primary": "#135bec",
            "mint": {
                50: '#f0fdf4',
                100: '#dcfce7',
                500: '#22c55e',
                600: '#16a34a',
                700: '#15803d',
            },
            "slate": {
                50: '#f8fafc',
                100: '#f1f5f9',
                200: '#e2e8f0',
                300: '#cbd5e1',
                400: '#94a3b8',
                500: '#64748b',
                600: '#475569',
                700: '#334155',
                800: '#1e293b',
                900: '#0f172a',
            },
            "background-light": "#f6f6f8",
            "background-dark": "#101622",
        },
        fontFamily: {
            "display": ["Inter", "sans-serif"]
        },
        borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
    },
  },
  plugins: [],
}
