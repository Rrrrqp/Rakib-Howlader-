import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-firebase-config',
        closeBundle() {
          try {
            const src = path.resolve(__dirname, 'firebase-applet-config.json');
            const dest = path.resolve(__dirname, 'dist', 'firebase-applet-config.json');
            if (fs.existsSync(src)) {
              fs.mkdirSync(path.dirname(dest), { recursive: true });
              fs.copyFileSync(src, dest);
              console.log('Firebase configuration successfully copied to dist/ folder for Netlify/production deployment.');
            } else {
              console.warn('firebase-applet-config.json not found at project root');
            }
          } catch (err) {
            console.error('Failed to copy firebase-applet-config.json:', err);
          }
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
