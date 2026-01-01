import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm Culinary Palette - Kitchen Vibes
        background: '#fffbf5',  // Warm cream
        foreground: '#3d2c1e',  // Warm brown

        // Primary: Tomato Red (Appetite stimulating)
        primary: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#ffcdc9',
          300: '#fda4a4',
          400: '#f87171',
          500: '#e53e3e',  // Tomato red - main
          600: '#c53030',  // Deep tomato
          700: '#9b2c2c',  // Rich red
          800: '#822727',
          900: '#6b1f1f',
          950: '#450a0a',
        },

        // Secondary: Fresh Basil Green (Natural, organic)
        secondary: {
          50: '#f0fdf0',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Fresh basil
          600: '#16a34a',  // Deep green
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // Accent: Golden Honey (Warmth, comfort)
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',  // Honey gold
          500: '#f59e0b',  // Rich amber
          600: '#d97706',  // Deep honey
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        // Warm Neutral Palette (Creamy, Kitchen-like)
        neutral: {
          50: '#fdfcfa',   // Warm white
          100: '#f8f6f2',  // Cream
          200: '#f0ece4',  // Light beige
          300: '#e4ddd2',  // Warm sand
          400: '#c9bfb0',  // Muted tan
          500: '#a89f90',  // Warm gray
          600: '#857a6b',  // Deep taupe
          700: '#6b6155',  // Brown gray
          800: '#4a4239',  // Dark brown
          900: '#3d2c1e',  // Deep brown
          950: '#1a130c',  // Near black warm
        },

        // Kitchen Colors (Food-inspired)
        kitchen: {
          cream: '#fef9f0',
          butter: '#fff8dc',
          olive: '#808000',
          paprika: '#8b4513',
          basil: '#228b22',
          tomato: '#ff6347',
          lemon: '#fff44f',
          chocolate: '#7b3f00',
        },

        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },

      fontFamily: {
        // Display: Fraunces - playful serif perfect for food
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        // Body: DM Sans - clean, readable
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },

      fontSize: {
        // Fluid typography scale
        'fluid-xs': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
        'fluid-sm': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
        'fluid-base': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
        'fluid-xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
        'fluid-2xl': 'clamp(1.5rem, 1.25rem + 1.25vw, 2rem)',
        'fluid-3xl': 'clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem)',
        'fluid-4xl': 'clamp(2.25rem, 1.75rem + 2.5vw, 3.5rem)',
        'fluid-5xl': 'clamp(3rem, 2rem + 5vw, 5rem)',
      },

      boxShadow: {
        'xs': '0 1px 2px 0 rgb(61 44 30 / 0.03)',
        'soft': '0 2px 8px -2px rgb(61 44 30 / 0.08), 0 1px 3px -1px rgb(61 44 30 / 0.05)',
        'card': '0 4px 12px -4px rgb(61 44 30 / 0.1), 0 2px 6px -2px rgb(61 44 30 / 0.06)',
        'elevated': '0 12px 32px -8px rgb(61 44 30 / 0.15), 0 4px 12px -4px rgb(61 44 30 / 0.08)',
        'warm': '0 8px 24px -4px rgb(229 62 62 / 0.12)',
        'glow-primary': '0 0 40px rgb(229 62 62 / 0.2)',
        'glow-accent': '0 0 40px rgb(245 158 11 / 0.25)',
        'glow-success': '0 0 30px rgb(34 197 94 / 0.2)',
        'inner-soft': 'inset 0 2px 4px 0 rgb(61 44 30 / 0.05)',
      },

      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },

      animation: {
        // Page load animations
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.6s ease-out forwards',
        'fade-in-left': 'fadeInLeft 0.6s ease-out forwards',
        'fade-in-right': 'fadeInRight 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',

        // Continuous animations (subtle, warm)
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-warm': 'pulseWarm 3s ease-in-out infinite',
        'sway': 'sway 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'steam': 'steam 3s ease-in-out infinite',

        // Interactive animations
        'wiggle': 'wiggle 0.3s ease-in-out',
        'pop': 'pop 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
      },

      keyframes: {
        // Fade animations
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },

        // Scale animations
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },

        // Slide animations
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // Warm, organic animations
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        pulseWarm: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        steam: {
          '0%': { opacity: '0', transform: 'translateY(0) scale(1)' },
          '50%': { opacity: '0.6' },
          '100%': { opacity: '0', transform: 'translateY(-20px) scale(1.5)' },
        },

        // Interactive animations
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-warm': 'linear-gradient(135deg, #fef3f2 0%, #fffbeb 50%, #f0fdf0 100%)',
        'gradient-kitchen': 'linear-gradient(135deg, #fff8dc 0%, #fef9f0 50%, #f0fdf0 100%)',
        'gradient-hero': 'linear-gradient(180deg, #fffbf5 0%, #fef3f2 100%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
        'pattern-dots': 'radial-gradient(circle, #e4ddd2 1px, transparent 1px)',
        'pattern-kitchen': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e4ddd2' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },

      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },

      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
