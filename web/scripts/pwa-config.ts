export const pwaBase = process.env.PWA_BASE_PATH ?? '/aplikacja-fiszki---python-web/';
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(pwaBase)) throw new Error('PWA_BASE_PATH musi być ścieżką zaczynającą i kończącą się znakiem /.');
export const maximumPrecacheFileSize = 8 * 1024 * 1024;
