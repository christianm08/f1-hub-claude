import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// HashRouter: nessun rewrite lato server necessario. base relativa = funziona da qualsiasi hosting statico.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
})
