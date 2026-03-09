import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { frontendErrorCollectorVitePlugin } from "@sandbox-agent/factory-frontend-errors/vite";

const backendProxyTarget = process.env.HF_BACKEND_HTTP?.trim() || "http://127.0.0.1:7741";
const cacheDir = process.env.HF_VITE_CACHE_DIR?.trim() || undefined;
const frontendClientMode = process.env.FACTORY_FRONTEND_CLIENT_MODE?.trim() || "remote";
export default defineConfig({
  define: {
    "import.meta.env.FACTORY_FRONTEND_CLIENT_MODE": JSON.stringify(
      frontendClientMode,
    ),
  },
  plugins: [react(), frontendErrorCollectorVitePlugin()],
  cacheDir,
  resolve: {
    alias: {
      "@workbench-runtime": fileURLToPath(
        new URL(
          frontendClientMode === "mock"
            ? "./src/lib/workbench-runtime.mock.ts"
            : "./src/lib/workbench-runtime.remote.ts",
          import.meta.url,
        ),
      ),
    },
  },
  server: {
    port: 4173,
    proxy: {
      "/api/rivet": {
        target: backendProxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
});
