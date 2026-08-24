/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mint: {
          primary: '#0B3D91',
          secondary: '#0A2342',
          accent: '#138A36',
          gold: '#F4B400',
          light: '#F8FAFC',
          border: '#E2E8F0',
          gray: '#64748B',
          text: '#1E293B'
        }
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.55', letterSpacing: '0.005em' }],
        base: ['0.9375rem', { lineHeight: '1.6', letterSpacing: '0' }],
        lg: ['1rem', { lineHeight: '1.55', letterSpacing: '-0.01em' }],
        xl: ['1.125rem', { lineHeight: '1.45', letterSpacing: '-0.015em' }],
        '2xl': ['1.375rem', { lineHeight: '1.35', letterSpacing: '-0.02em' }],
        '3xl': ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        '4xl': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.025em' }],
        '5xl': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.03em' }]
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}