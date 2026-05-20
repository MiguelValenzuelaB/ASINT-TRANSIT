/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // ----- PRIMARIO: AZUL MARINO (color predominante) ----- //
        'primary': '#1A3A6B',

        'primary-dim': '#142E58',
        'primary-fixed': '#2C4E84',
        'primary-fixed-dim': '#1A3A6B',
        'on-primary': '#FFFFFF',
        'on-primary-fixed': '#FFFFFF',
        'on-primary-fixed-variant': '#D0DAEA',
        'on-primary-container': '#1A3A6B',
        'primary-container': '#D0DAEA',
        'inverse-primary': '#7B9BC9',

        // ----- SECUNDARIO: AZUL MEDIO ----- //
        'secondary': '#2C4E84',

        'secondary-dim': '#1F3D6B',
        'secondary-fixed': '#E5ECF5',
        'secondary-fixed-dim': '#B8C8DC',
        'on-secondary': '#FFFFFF',
        'on-secondary-fixed': '#1A3A6B',
        'on-secondary-fixed-variant': '#2C4E84',
        'on-secondary-container': '#1A3A6B',
        'secondary-container': '#E5ECF5',

        // ----- TERCIARIO: ADVERTENCIA Y ALERTAS ----- //
        'tertiary': '#D99300',

        'tertiary-dim': '#B57A00',
        'tertiary-fixed': '#FFEAAA',
        'tertiary-fixed-dim': '#FFD966',
        'on-tertiary': '#FFFFFF',
        'on-tertiary-fixed': '#2B1F00',
        'on-tertiary-fixed-variant': '#3D2D00',
        'tertiary-container': '#FFEAAA',
        'on-tertiary-container': '#2B1F00',

        // ----- SUPERFICIES: Blanco y grises claros ----- //
        'background': '#F5F7FA',
        'surface': '#FFFFFF',

        'surface-dim': '#E8EDF3',
        'surface-bright': '#FFFFFF',
        'surface-tint': '#1A3A6B',
        'surface-variant': '#E5ECF5',
        'surface-container-lowest': '#FFFFFF',
        'surface-container-low': '#F5F7FA',
        'surface-container': '#EEF2F8',
        'surface-container-high': '#E5ECF5',
        'surface-container-highest': '#D8E2EE',

        // ----- TEXTOS ----- //
        'on-surface': '#0F1F3D',
        'on-background': '#0F1F3D',

        'on-surface-variant': '#4A5E80',
        'inverse-surface': '#0F1F3D',
        'inverse-on-surface': '#F5F7FA',

        //----- CONTORNOS -----//
        'outline': '#4A5E80',
        'outline-variant': '#1A3A6B',

        // ----- ERRORES ----- //
        'error': '#C8102E',

        'error-dim': '#A50D25',
        'error-container': '#FFD0D7',
        'on-error': '#FFFFFF',
        'on-error-container': '#8C0008',
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
      fontFamily: {
        headline: ['Rajdhani', 'sans-serif'],
        body: ['DM sans', 'sans-serif'],
        label: ['DM sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
