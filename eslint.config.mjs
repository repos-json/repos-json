import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "_site/**", "**/*.d.ts"],
  },
  eslint.configs.recommended,
  // `strict` bans `any` and `!`; `stylistic` is the ONLY preset carrying
  // `consistent-type-assertions`, which is the rule that stops `as`. Taking `strict` alone would
  // silently leave assertions unchecked.
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    languageOptions: {
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // This package reads a file nobody here wrote. An `as` is exactly the move that turns
      // untrusted JSON into a type nothing checked — the guards in src/guards.ts exist so that
      // every narrowing is a runtime test.
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^__", varsIgnorePattern: "^__" }],
      // `node:test`'s `test()` returns a promise nobody is meant to await — the runner owns it.
      // Named rather than switched off for test files, so a genuinely floating promise in a test
      // still fails.
      "@typescript-eslint/no-floating-promises": ["error", { allowForKnownSafeCalls: [{ from: "package", name: "test", package: "node:test" }] }],
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
    },
  },
  eslintConfigPrettier,
];
