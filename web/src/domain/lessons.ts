export interface Card {
  id: string;
  answer: string;
  imageUrl: string;
  revision?: string;
}

export interface Lesson {
  id: string;
  name: string;
  source: 'bundled' | 'imported';
  temporary?: boolean;
  cards: Card[];
}

export const imageTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export function extension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

export function isImage(filename: string): boolean {
  return Object.hasOwn(imageTypes, extension(filename));
}

export function answerFromFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

// Match Python's sorting by name.lower(), independently of browser locale.
export function compareNames(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortLessons(lessons: readonly Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => compareNames(a.name, b.name));
}
