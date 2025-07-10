/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(20, 14.3%, 4.1%)",
        foreground: "hsl(0, 0%, 95%)",
        card: "hsl(24, 9.8%, 10%)",
        "card-foreground": "hsl(0, 0%, 95%)",
        popover: "hsl(0, 0%, 9%)",
        "popover-foreground": "hsl(0, 0%, 95%)",
        primary: "hsl(142.1, 76.2%, 36.3%)",
        "primary-foreground": "hsl(355.7, 100%, 97.3%)",
        secondary: "hsl(240, 3.7%, 15.9%)",
        "secondary-foreground": "hsl(0, 0%, 98%)",
        muted: "hsl(0, 0%, 15%)",
        "muted-foreground": "hsl(240, 5%, 64.9%)",
        accent: "hsl(12, 6.5%, 15.1%)",
        "accent-foreground": "hsl(0, 0%, 98%)",
        destructive: "hsl(0, 62.8%, 30.6%)",
        "destructive-foreground": "hsl(0, 85.7%, 97.3%)",
        border: "hsl(240, 3.7%, 15.9%)",
        input: "hsl(240, 3.7%, 15.9%)",
        ring: "hsl(142.4, 71.8%, 29.2%)",
      },
    },
  },
  plugins: [],
}