import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `base` relatif : le build peut être servi à la racine ou dans un sous-dossier (ex. /app/ sur Cloudflare Pages).
export default defineConfig({ plugins: [react()], base: './' });
