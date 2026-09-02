import test from "node:test";
import assert from "node:assert/strict";
import {
	decodeHeicImage,
	extractImageBinaryMetadata,
	batchDecodeHeicImages,
} from "../heicDecoder";
import { COLOR_SPACES, EXIF_ORIENTATIONS } from "@dental/shared";

test("extractImageBinaryMetadata extracts ISOBMFF box dimensions & Display P3 profile", () => {
	// Simulated HEIC box with Apple signature and 'ispe' dimensions 4032x3024
	const buffer = new Uint8Array(128);
	// 'ftyp'
	buffer[4] = 0x66;
	buffer[5] = 0x74;
	buffer[6] = 0x79;
	buffer[7] = 0x70;
	// 'heic'
	buffer[8] = 0x68;
	buffer[9] = 0x65;
	buffer[10] = 0x69;
	buffer[11] = 0x63;

	// 'Apple' signature at offset 20
	buffer[20] = 0x41;
	buffer[21] = 0x70;
	buffer[22] = 0x70;
	buffer[23] = 0x6c;
	buffer[24] = 0x65;

	// 'ispe' box at offset 32
	buffer[32] = 0x69;
	buffer[33] = 0x73;
	buffer[34] = 0x70;
	buffer[35] = 0x65;
	// width 4032 (0x00000FC0)
	buffer[40] = 0x00;
	buffer[41] = 0x00;
	buffer[42] = 0x0f;
	buffer[43] = 0xc0;
	// height 3024 (0x00000BD0)
	buffer[44] = 0x00;
	buffer[45] = 0x00;
	buffer[46] = 0x0b;
	buffer[47] = 0xd0;

	const meta = extractImageBinaryMetadata(buffer);
	assert.equal(meta.make, "Apple");
	assert.equal(meta.colorSpace, COLOR_SPACES.DISPLAY_P3);
	assert.equal(meta.hasWideGamutP3, true);
	assert.equal(meta.width, 4032);
	assert.equal(meta.height, 3024);
});

test("decodeHeicImage returns valid HeicDecodingResult with fallback and thumbnail", async () => {
	const dummyBuffer = new Uint8Array([
		0x00, 0x00, 0x00, 0x18,
		0x66, 0x74, 0x79, 0x70, // 'ftyp'
		0x68, 0x65, 0x69, 0x63, // 'heic'
		0x00, 0x00, 0x00, 0x00,
		0x6d, 0x69, 0x66, 0x31,
		0x68, 0x65, 0x69, 0x78,
	]);

	const result = await decodeHeicImage(dummyBuffer, {
		targetFormat: "webp",
		quality: 0.9,
		maxDimension: 2048,
	});

	assert.equal(result.success, true);
	assert.equal(result.format, "webp");
	assert.ok(result.dataUrl.startsWith("data:image/webp"));
	assert.ok(result.thumbnailWebpDataUrl.startsWith("data:image/webp"));
	assert.ok(result.width > 0);
	assert.ok(result.height > 0);
});

test("batchDecodeHeicImages processes multiple files with concurrency window", async () => {
	const dummyBuffer = new Uint8Array(32);
	const files = [
		new Blob([dummyBuffer], { type: "image/heic" }),
		new Blob([dummyBuffer], { type: "image/heic" }),
		new Blob([dummyBuffer], { type: "image/heic" }),
	];

	let progressCallCount = 0;
	const results = await batchDecodeHeicImages(
		files,
		{ maxDimension: 1200 },
		() => {
			progressCallCount++;
		},
	);

	assert.equal(results.length, 3);
	assert.ok(progressCallCount > 0);
	for (const r of results) {
		assert.equal(r.success, true);
	}
});
