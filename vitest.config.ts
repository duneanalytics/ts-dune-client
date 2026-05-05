import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/tests/**/*.spec.ts"],
    testTimeout: 10000,
    globals: true,
  },
});
