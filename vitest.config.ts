import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { config } from "dotenv";

config({ debug: false });
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    hookTimeout: 60_000,
  },
});
