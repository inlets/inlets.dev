module.exports = {
  purge: [],
  theme: {
    typography: {
      default: {
        css: {
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
    },
    extend: {},
  },
  variants: {},
  plugins: [
    require('@tailwindcss/ui'),
    require("postcss-import"),
    require("autoprefixer"),
    require("@tailwindcss/typography"),
  ],
}
