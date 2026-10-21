import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // `@/` apunta a `src/`, para importar sin rutas relativas largas.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
