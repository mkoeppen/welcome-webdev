import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite-plus';

// Zwei Artefakte: Extension-Host (vp pack -> dist/extension.cjs) und Webview (vp build -> dist/webview).
// Feste Dateinamen, damit der Host die Asset-URLs ohne Manifest umschreiben kann.
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist/webview',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: {
      output: { entryFileNames: 'assets/app.js', assetFileNames: 'assets/[name][extname]' },
    },
  },
  pack: {
    entry: { extension: 'src/host/extension.ts' },
    format: 'cjs',
    platform: 'node',
    outDir: 'dist',
    clean: false,
    deps: { neverBundle: ['vscode'] },
  },
  test: { include: ['src/**/*.test.ts'] },
  fmt: { singleQuote: true, printWidth: 140, ignorePatterns: ['dist', 'pnpm-lock.yaml'] },
  lint: { ignorePatterns: ['dist', 'node_modules'] },
});
