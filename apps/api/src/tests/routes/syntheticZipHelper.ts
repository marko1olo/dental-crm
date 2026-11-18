/**
 * apps/api/src/tests/routes/syntheticZipHelper.ts
 *
 * Lightweight synthetic ZIP file generator for integration tests.
 */

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
	let c = i;
	for (let j = 0; j < 8; j++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	CRC_TABLE[i] = c >>> 0;
}

function computeCrc32(data: Buffer): number {
	let crc = 0 ^ -1;
	for (let i = 0; i < data.length; i++) {
		crc = (crc >>> 8) ^ (CRC_TABLE[(crc ^ data[i]!) & 0xff] ?? 0);
	}
	return (crc ^ -1) >>> 0;
}

export function createSyntheticZipBuffer(
	files: { name: string; content: Buffer | string }[],
): Buffer {
	const localChunks: Buffer[] = [];
	const centralChunks: Buffer[] = [];
	let offset = 0;

	for (const f of files) {
		const nameBuf = Buffer.from(f.name, "utf8");
		const dataBuf = Buffer.isBuffer(f.content)
			? f.content
			: Buffer.from(f.content, "utf8");
		const size = dataBuf.length;
		const crc = computeCrc32(dataBuf);

		const localHeader = Buffer.alloc(30);
		localHeader.writeUInt32LE(0x04034b50, 0);
		localHeader.writeUInt16LE(20, 4);
		localHeader.writeUInt16LE(0, 6);
		localHeader.writeUInt16LE(0, 8); // Method 0 = STORE
		localHeader.writeUInt16LE(0, 10);
		localHeader.writeUInt16LE(0, 12);
		localHeader.writeUInt32LE(crc, 14);
		localHeader.writeUInt32LE(size, 18);
		localHeader.writeUInt32LE(size, 22);
		localHeader.writeUInt16LE(nameBuf.length, 26);
		localHeader.writeUInt16LE(0, 28);

		localChunks.push(localHeader, nameBuf, dataBuf);

		const centralHeader = Buffer.alloc(46);
		centralHeader.writeUInt32LE(0x02014b50, 0);
		centralHeader.writeUInt16LE(20, 4);
		centralHeader.writeUInt16LE(20, 6);
		centralHeader.writeUInt16LE(0, 8);
		centralHeader.writeUInt16LE(0, 10);
		centralHeader.writeUInt16LE(0, 12);
		centralHeader.writeUInt16LE(0, 14);
		centralHeader.writeUInt32LE(crc, 16);
		centralHeader.writeUInt32LE(size, 20);
		centralHeader.writeUInt32LE(size, 24);
		centralHeader.writeUInt16LE(nameBuf.length, 28);
		centralHeader.writeUInt16LE(0, 30);
		centralHeader.writeUInt16LE(0, 32);
		centralHeader.writeUInt16LE(0, 34);
		centralHeader.writeUInt16LE(0, 36);
		centralHeader.writeUInt32LE(0, 38);
		centralHeader.writeUInt32LE(offset, 42);

		centralChunks.push(centralHeader, nameBuf);
		offset += 30 + nameBuf.length + size;
	}

	let centralDirSize = 0;
	for (const chunk of centralChunks) {
		centralDirSize += chunk.length;
	}

	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0);
	eocd.writeUInt16LE(0, 4);
	eocd.writeUInt16LE(0, 6);
	eocd.writeUInt16LE(files.length, 8);
	eocd.writeUInt16LE(files.length, 10);
	eocd.writeUInt32LE(centralDirSize, 12);
	eocd.writeUInt32LE(offset, 16);
	eocd.writeUInt16LE(0, 20);

	return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}
