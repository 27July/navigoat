import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.js'),
        content: resolve(__dirname, 'src/content/content.js')
        // Remove popup.js from rollup input
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.'
        },
        {
          src: 'public/icons/*',
          dest: 'icons'
        },
        {
          src: 'src/content/content.css',
          dest: '.'
        },
        {
          src: 'src/popup/popup.css',
          dest: '.'
        },
        {
          src: 'src/popup/popup.html',
          dest: '.'
        },
        {
          src: 'src/popup/popup.js', // Copy popup.js directly
          dest: '.'
        }
      ]
    })
  ]
});