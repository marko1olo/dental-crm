/**
 * packages/shared/src/imaging/volumeImporters/gzipHelper.ts
 * Cross-platform gunzip utility for Node.js and Browser environments.
 * Enforces a strict decompressed byte budget to prevent gzip bomb attacks.
 */

/**
 * Checks if a byte sequence starts with gzip magic header (0x1f, 0x8b).
 */
export function isGzip(data: Uint8Array): boolean {
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

/**
 * Extracts the base filename without directory prefixes.
 */
export function extractBaseName(pathOrName: string): string {
  const normalized = pathOrName.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || pathOrName;
}

/**
 * Decompresses gzip data up to maxBytes.
 * If data is not gzip, returns it directly after verifying it does not exceed maxBytes.
 */
export async function safeGunzip(data: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  if (!isGzip(data)) {
    if (data.byteLength > maxBytes) {
      throw new Error(`Payload (${data.byteLength} bytes) exceeds budget of ${maxBytes} bytes`);
    }
    return data;
  }

  // Node.js environment detection
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const zlib = await import("node:zlib");
      const unzipped = zlib.gunzipSync(data, { maxOutputLength: maxBytes });
      if (unzipped.byteLength > maxBytes) {
        throw new Error(`Decompressed payload exceeds budget of ${maxBytes} bytes`);
      }
      return new Uint8Array(unzipped.buffer, unzipped.byteOffset, unzipped.byteLength);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("budget")) {
        throw err;
      }
      // Fallback to Web Streams if zlib fails
    }
  }

  // Web Streams DecompressionStream (browsers & modern runtimes)
  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"));
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalLength += value.byteLength;
        if (totalLength > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw new Error(`Gzip payload exceeds decompression budget of ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  throw new Error("No gzip decompression implementation available in current environment");
}
