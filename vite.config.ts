import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    // HMR (Hot Module Replacement) ajuda a evitar erros de WebSocket no console
    hmr: {
      overlay: true,
    },
  },
  resolve: {
    alias: {
      /**
       * Se você usa importações como '@/components/Login', 
       * o comando abaixo garante que o Vite procure na pasta correta.
       * Se seus arquivos estão na raiz, mude 'src' para '.'
       */
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Otimização para garantir que o Vite encontre as dependências do React 19 e Router 7
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@supabase/supabase-js"],
  },
});