import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["server/utils/credential-core.ts", "shared/utils/import-normalizer.ts", "shared/utils/badge-layout.ts", "shared/utils/supplier-catalog.ts"],
      reporter: ["text", "json-summary"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
    },
  },
})
