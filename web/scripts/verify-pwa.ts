import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maximumPrecacheFileSize, pwaBase } from './pwa-config.ts';
import type { Manifest } from './generate-lessons.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist-pwa');
const entries: { url: string }[] = JSON.parse(await readFile(path.join(dist, 'precache-report.json'), 'utf8'));
const urls = new Set(entries.map((entry) => entry.url.startsWith(pwaBase) ? entry.url.slice(pwaBase.length) : entry.url));
const data: Manifest = JSON.parse(await readFile(path.join(dist, 'generated/lessons.json'), 'utf8'));
const required = ['index.html', 'manifest.webmanifest', 'generated/lessons.json', 'icons/apple-touch-icon.png', ...data.lessons.flatMap((lesson) => lesson.cards.map((card) => card.imagePath))];
for (const file of await readdir(path.join(dist, 'assets'))) required.push(`assets/${file}`);
for (const file of await readdir(path.join(dist, 'icons'))) required.push(`icons/${file}`);
for (const file of required) {
  assert.ok(urls.has(file), `Brak zasobu w precache: ${file}`);
  assert.ok((await stat(path.join(dist, file))).size <= maximumPrecacheFileSize, `Przekroczony limit precache: ${file}`);
}
const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.id, pwaBase);
assert.equal(manifest.start_url, pwaBase);
assert.equal(manifest.scope, pwaBase);
assert.equal(manifest.display, 'standalone');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
assert.match(html, /rel="apple-touch-icon"/);
assert.ok(html.includes(`${pwaBase}assets/`));
assert.ok(!html.includes('embedded-lessons'), 'PWA nie może zawierać danych single-file.');
const worker = await readFile(path.join(dist, 'sw.js'), 'utf8');
assert.ok(!worker.includes('__WB_MANIFEST') && !worker.includes('__PWA_BUILD_ID__'), 'Niepodstawiona konfiguracja service workera.');
for (const { url } of entries) assert.ok(worker.includes(JSON.stringify(url)), `Zasób nie trafił do service workera: ${url}`);
console.log(`PWA: precache ${urls.size} zasobów, w tym ${data.lessons.flatMap((lesson) => lesson.cards).length} grafik; limit ${maximumPrecacheFileSize / 1024 / 1024} MB/plik; scope ${pwaBase}.`);
