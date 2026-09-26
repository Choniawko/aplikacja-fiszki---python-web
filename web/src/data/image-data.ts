import { imageTypes } from '../domain/lessons.ts';

const supportedTypes = new Set(Object.values(imageTypes));

export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (!supportedTypes.has(blob.type)) throw new Error('Nieobsługiwany format grafiki w kopii zapasowej.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)));
  }
  return `data:${blob.type};base64,${btoa(parts.join(''))}`;
}

export function dataUrlToBlob(value: string): Blob {
  const match = /^data:(image\/(?:png|jpeg|bmp|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2]!.length % 4 !== 0) throw new Error('Nieprawidłowa grafika w kopii zapasowej.');
  try {
    const binary = atob(match[2]!);
    return new Blob([Uint8Array.from(binary, (character) => character.charCodeAt(0))], { type: match[1]! });
  } catch {
    throw new Error('Nieprawidłowa grafika w kopii zapasowej.');
  }
}
