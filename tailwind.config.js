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
    },
  },
  plugins: [],
}
