/**
 * @type {import("prettier").Config & import("prettier-plugin-tailwindcss").PluginOptions}
 */
const config = {
  semi: true,
  tabWidth: 2,
  bracketSpacing: true,
  bracketSameLine: false,
  endOfLine: "lf",
  singleQuote: false,
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/index.css",
  tailwindFunctions: ["cn"],
};

export default config;
