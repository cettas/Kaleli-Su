import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // API proxy for development
        proxy: mode === 'development' ? {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/webhook': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          }
        } : undefined
      },
      plugins: [
        react(),
        {
          name: 'copy-service-worker',
          writeBundle() {
            copyFileSync('sw.js', 'dist/sw.js');
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'supabase': ['@supabase/supabase-js']
            }
          }
        }
      }
    };
});
