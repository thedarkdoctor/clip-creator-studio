import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist'
  },
  
  server: {
    host: true,
    port: 8080,
    strictPort: true,
    cors: true,
    hmr: {
      clientPort: 443,
      overlay: false,
    },
    allowedHosts: true
  },

  preview: {
    host: true,
    port: 8080,
    strictPort: true,
    allowedHosts: true
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
