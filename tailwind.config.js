/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens mapped to CSS variables (switch in .dark)
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        border: 'var(--border)',
        input: 'var(--input)',
        muted: 'var(--muted)',
        primary: 'var(--foreground)',
        secondary: 'var(--muted)',
        // Brand green scale (primary kept as #00A884)
        brand: {
          50: '#E7F8F3',
          100: '#C6F0E4',
          200: '#96E2D0',
          300: '#61D0B9',
          400: '#33BCA1',
          500: '#00A884',
          600: '#008F72',
          700: '#00745D',
          800: '#005C4B',
          900: '#004034',
        },
        // WhatsApp Light Theme
        "wa-light": {
          bg: '#F0F2F5',
          chat: '#EFEAE2',
          panel: '#FFFFFF',
          header: '#F0F2F5',
          bubble: '#D9FDD3',
          border: '#E9EDEF',
          text: '#111B21',
          secondary: '#667781',
        },
        // WhatsApp Dark Theme
        "wa-dark": {
          bg: '#111B21',
          chat: '#0B141A',
          panel: '#202C33',
          header: '#202C33',
          bubble: '#005C4B',
          border: '#2A3942',
          text: '#E9EDEF',
          secondary: '#8696A0',
        },
      },
      keyframes: {
        "message-in": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "message-in": "message-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "slide-up": "slide-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
}
