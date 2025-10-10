import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  root: './',
  base: '/mobile/',

  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: 'Fingrow - Mobile Marketplace'
        }
      }
    })
  ],

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5050',
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: './dist',
    emptyOutDir: true,
    sourcemap: true
  },

  resolve: {
    alias: {
      '@': '/src',
      '@js': '/src/js',
      '@styles': '/src/styles',
      '@assets': '/src/assets'
    }
  }
});
