import { defineConfig } from 'vite';
import type { ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { embeddedJson, embedMaterials } from './scripts/offline-materials.ts';
import { VitePWA } from 'vite-plugin-pwa';
import { writeFile } from 'node:fs/promises';
import { maximumPrecacheFileSize, pwaBase } from './scripts/pwa-config.ts';
import path from 'node:path';

let pwaAuditFile = fileURLToPath(new URL('./dist-pwa/precache-report.json', import.meta.url));

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
  ] : []), ...(mode === 'pwa' ? [
    {
      name: 'apple-pwa-icon',
      configResolved(config: ResolvedConfig) { pwaAuditFile = path.resolve(config.root, config.build.outDir, 'precache-report.json'); },
      transformIndexHtml: () => [
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${pwaBase}icons/apple-touch-icon.png` }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Fiszki' }, injectTo: 'head' as const },
      ],
    },
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      injectRegister: false,
      registerType: 'prompt',
      scope: pwaBase,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Fiszki', short_name: 'Fiszki', lang: 'pl',
        description: 'Fiszki do nauki symboli, dostępne także offline.',
        id: pwaBase, start_url: pwaBase, scope: pwaBase,
        display: 'standalone', background_color: '#f0f0f0', theme_color: '#f0f0f0',
        icons: [
          { src: `${pwaBase}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${pwaBase}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${pwaBase}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        minify: false,
        globPatterns: ['**/*.{js,css,html,json,png,jpg,jpeg,bmp,gif,webp,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: maximumPrecacheFileSize,
        manifestTransforms: [async (entries) => {
          const unique = [...new Map(entries.map((entry) => [entry.url, entry])).values()];
          await writeFile(pwaAuditFile, JSON.stringify(unique, null, 2));
          return { manifest: unique, warnings: [] };
        }],
      },
      devOptions: { enabled: false },
    }),
  ] : [])],
  define: { __PWA_BUILD_ID__: JSON.stringify(process.env.PWA_BUILD_ID ?? new Date().toISOString()) },
  publicDir: mode === 'offline' ? false : 'public',
  base: mode === 'pwa' ? pwaBase : './',
  build: {
    outDir: mode === 'offline' ? 'dist-offline' : mode === 'pwa' ? 'dist-pwa' : 'dist',
    modulePreload: mode === 'offline' ? false : undefined,
  },
}));
