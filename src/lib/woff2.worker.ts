/// <reference lib="webworker" />
import decompress from 'woff2-encoder/decompress';

/**
 * Decompresses WOFF2 to SFNT off the main thread. The decoder's glue code needs `eval`,
 * which the server allows for this worker script only; the page CSP stays strict.
 */
self.onmessage = async ({ data }: MessageEvent<ArrayBuffer>) => {
  try {
    const sfnt = await decompress(data);
    const bytes = sfnt.buffer.slice(sfnt.byteOffset, sfnt.byteOffset + sfnt.byteLength);
    self.postMessage(bytes, { transfer: [bytes as ArrayBuffer] });
  } catch {
    self.postMessage(null);
  }
};
