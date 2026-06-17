import { defineConfig } from "vite";

export default defineConfig({
  base: "/pdf-report-sample/",
  server: {
    host: true,
    port: 5173,
  },
});
