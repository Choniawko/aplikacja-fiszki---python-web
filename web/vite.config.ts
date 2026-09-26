import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { embeddedJson, embedMaterials } from './scripts/offline-materials.ts';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'offline' ? [
    {
      name: 'embedded-lesson-materials',
      async transformIndexHtml() {
        const manifest = await embedMaterials(fileURLToPath(new URL('./public/', import.meta.url)));
        return [
          { tag: 'script', attrs: { type: 'application/json', id: 'embedded-lessons' }, children: embeddedJson(manifest), injectTo: 'head' as const },
          { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'" }, injectTo: 'head-prepend' as const },
        ];
      },
    },
    viteSingleFile(),
  ] : [])],
  publicDir: mode === 'offline' ? false : 'public',
  base: './',
  build: {
    outDir: mode === 'offline' ? 'dist-offline' : 'dist',
    modulePreload: mode === 'offline' ? false : undefined,
  },
}));
