import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tauri-apps/api/core': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
      '@tauri-apps/api/event': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
      '@tauri-apps/api': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, './src/test/mocks/tauri-plugins.ts'),
      '@tauri-apps/plugin-shell': path.resolve(__dirname, './src/test/mocks/tauri-plugins.ts'),
      '@tauri-apps/plugin-updater': path.resolve(__dirname, './src/test/mocks/tauri-plugins.ts'),
      '@tauri-apps/plugin-process': path.resolve(__dirname, './src/test/mocks/tauri-plugins.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
})
