// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'], // Wichtig, da du .dark in globals.css verwendest
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}', // Falls du noch /pages hast
    './components/**/*.{js,ts,jsx,tsx,mdx}', // Falls du /components hast
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Wichtig für dein /src Verzeichnis
  ],
  theme: {
    container: {
      // Konfiguration für die 'container' Klasse in DashboardLayout
      center: true,
      padding: '1rem', // Standard-Padding für Container (kannst du anpassen)
      screens: {
        // Breakpoints - diese sind entscheidend!
        sm: '640px',
        md: '768px',
        lg: '1024px', // Standard Tailwind LG Breakpoint
        xl: '1280px',
        '2xl': '1536px',
      },
    },
    extend: {
      // Hier kannst du die Farben etc. aus deinem globals.css als
      // Tailwind-Klassen verfügbar machen, wenn du möchtest, z.B.:
      colors: {
        border: 'hsl(var(--border))', // Beispiel für Shadcn/ui Konvention
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          // foreground: 'hsl(var(--destructive-foreground))', // Falls definiert
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Füge hier ggf. deine Sidebar- und Chart-Farben hinzu, wenn
        // du sie als Tailwind-Klassen nutzen willst (z.B. bg-sidebar)
      },
      borderRadius: {
        // Damit Tailwind deinen Radius kennt
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // Damit Tailwind deine Schriftarten kennt
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      // Hier können weitere Erweiterungen rein (Keyframes, etc.)
    },
  },
  plugins: [
    require('tailwindcss-animate'), // Falls du Animationen (wie von Shadcn/ui) nutzt
    require('@tailwindcss/typography'), // Optional, für Prosa-Styling
  ],
};
