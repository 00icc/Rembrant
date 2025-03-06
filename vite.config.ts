import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
  plugins: [
    solid(),
    electron({
      entry: 'electron/main.ts',
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            external: ['electron', 'electron-store', 'chokidar', 'fs-extra']
          }
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
            '@electron': path.resolve(__dirname, 'electron')
          }
        }
      }
    })
  ],
  build: {
    target: 'esnext'
  }
})
