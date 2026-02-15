import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      include: [
        "src/lib/**/*.ts",
        "src/types/credits.ts",
      ],
      exclude: [
        "src/lib/supabase/**",
        "src/lib/analytics/**",
        "src/lib/meta/**",
        "src/lib/stores/**",
        "src/lib/stripe/**",
        "src/lib/pdf/**",
        "src/lib/extension/**",
        "src/lib/data/**",
        "src/lib/automations/**",
        "src/lib/hooks/**",
        "src/lib/ai/openai.ts",
        "src/lib/ai/providers.ts",
        "src/lib/ai/brand-guidelines-generator.ts",
        "src/lib/ai/competitor-report.ts",
        "src/lib/ai/creative-enhance.ts",
        "src/lib/ai/comparison.ts",
        "src/lib/ai/insights.ts",
        "src/types/index.ts",
        "**/*.d.ts",
        "**/*.test.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
