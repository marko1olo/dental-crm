import { deflateSync } from "node:zlib";

export let pngCrcTable: Uint32Array | null = null;

export function crc32(buffer: Buffer): number {
	if (!pngCrcTable) {
		pngCrcTable = new Uint32Array(256);
		for (let index = 0; index < 256; index += 1) {
			let value = index;
			for (let bit = 0; bit < 8; bit += 1) {
				value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
			}
			pngCrcTable[index] = value >>> 0;
		}
	}

	let crc = 0xffffffff;
	const table = pngCrcTable;
	for (const byte of buffer) {
		const lookup = table[(crc ^ byte) & 0xff] ?? 0;
		crc = lookup ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

export function buildPngChunk(type: string, data: Buffer): Buffer {
	const typeBuffer = Buffer.from(type, "ascii");
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
	return Buffer.concat([length, typeBuffer, data, crc]);
}

export function rgbaToPngDataUrl(width: number, height: number, rgba: Buffer): string {
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y += 1) {
		raw[y * (stride + 1)] = 0;
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
	}

	const png = Buffer.concat([
		signature,
		buildPngChunk("IHDR", ihdr),
		buildPngChunk("IDAT", deflateSync(raw)),
		buildPngChunk("IEND", Buffer.alloc(0)),
	]);
	return `data:image/png;base64,${png.toString("base64")}`;
}
