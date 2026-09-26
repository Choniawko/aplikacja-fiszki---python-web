import { readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { zipSync } from 'fflate';
import { verifyOffline } from './verify-offline.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
await rename(path.join(root, 'dist-offline/index.html'), path.join(root, 'dist-offline/fiszki.html'));
await verifyOffline(root);
const archive = zipSync({
  'fiszki.html': await readFile(path.join(root, 'dist-offline/fiszki.html')),
  'INSTRUKCJA.txt': await readFile(path.join(root, 'docs/offline/INSTRUKCJA.txt')),
}, { level: 9, mtime: new Date('2026-01-01T00:00:00Z') });
await writeFile(path.join(root, 'fiszki-offline.zip'), archive);
console.log(`Gotowe: dist-offline/fiszki.html oraz fiszki-offline.zip (${(archive.byteLength / 1024 / 1024).toFixed(2)} MB).`);
