import { contentSignature } from '../src/domain/progress.ts';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { answerFromFilename, compareNames, extension, isImage } from '../src/domain/lessons.ts';

export interface Manifest {
  dataDirectoryMissing: boolean;
  lessons: {
    id: string;
    name: string;
    cards: { id: string; answer: string; imagePath: string; revision?: string }[];
  }[];
}

export async function generateLessons(dataDir: string, outputDir: string): Promise<Manifest> {
  const manifest: Manifest = { dataDirectoryMissing: false, lessons: [] };
  // Only this generated directory is replaced; source materials are never written.
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(path.join(outputDir, 'images'), { recursive: true });
  const directories = await readdir(dataDir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
    manifest.dataDirectoryMissing = true;
    return [];
  });
  for (const directory of directories.filter((entry) => entry.isDirectory()).sort((a, b) => compareNames(a.name, b.name))) {
    const lesson: Manifest['lessons'][number] = {
      id: `bundled:${directory.name}`,
      name: directory.name,
      cards: [],
    };
    const files = await readdir(path.join(dataDir, directory.name), { withFileTypes: true });
    for (const file of files.filter((entry) => entry.isFile() && isImage(entry.name)).sort((a, b) => compareNames(a.name, b.name))) {
      const relativePath = `${directory.name}/${file.name}`;
      // Opaque URLs keep filenames out of image tooltips and broken-image labels.
      const filename = createHash('sha256').update(relativePath).digest('hex') + extension(file.name);
      await copyFile(path.join(dataDir, directory.name, file.name), path.join(outputDir, 'images', filename));
      lesson.cards.push({
        id: `bundled:${relativePath}`,
        answer: answerFromFilename(file.name),
        revision: contentSignature(await readFile(path.join(dataDir, directory.name, file.name))),
        imagePath: `generated/images/${filename}`,
      });
    }
    manifest.lessons.push(lesson);
  }
  await writeFile(path.join(outputDir, 'lessons.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const webRoot = fileURLToPath(new URL('../', import.meta.url));
  const manifest = await generateLessons(path.join(webRoot, '../dane'), path.join(webRoot, 'public/generated'));
  const count = manifest.lessons.reduce((total, lesson) => total + lesson.cards.length, 0);
  console.log(`Przygotowano ${manifest.lessons.length} lekcje i ${count} grafik.`);
  if (manifest.dataDirectoryMissing) console.log("Nie znaleziono katalogu 'dane'. Dostępny będzie import folderów.");
}
