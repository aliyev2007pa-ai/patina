// Tailwind CSS 4 runs as a PostCSS plugin here so that the webpack build
// can process it. The project uses webpack instead of Turbopack because
// Windows Application Control blocks Next.js' native SWC binary on this
// machine, and Turbopack requires those native bindings.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
