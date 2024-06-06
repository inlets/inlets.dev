const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  purge: [],
  theme: {
    typography: {
      default: {
        css: {
          'p': {
            'margin-top': '0.75em',
            'margin-bottom': '0.75em'
          },
          'code::before': { // Stop quoting inline code blocks
            content: '""',
          },
          'code::after': {
            content: '""',
          },
          'blockquote p:first-of-type::before': { // The "> text " (quoted) in blogs
            content: '""',
          },
          'blockquote p:last-of-type::after': {
            content: '""',
          },
        },
      },
      lg: {
        css: {
          'li': {
            marginTop: 0,
            marginBottom: 0,
          }
        }
      }
    },
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      }
    }
  },
  variants: {},
  plugins: [
    require('@tailwindcss/ui'),
    require("postcss-import"),
    require("autoprefixer"),
    require("@tailwindcss/typography"),
  ],
}
