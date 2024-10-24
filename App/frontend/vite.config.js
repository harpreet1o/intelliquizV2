import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/CPSC-2350-Project",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/setupTest.js"],
  },
});
