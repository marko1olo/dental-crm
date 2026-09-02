import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { decodeServerHeicImage } from "../serverHeicDecoder.js";

test("serverHeicDecoder successfully decodes image buffer and creates thumbnails", async () => {
	// Create a test raw image with sharp (800x600 red image)
	const testBuffer = await sharp({
		create: {
			width: 800,
			height: 600,
			channels: 4,
			background: { r: 210, g: 80, b: 80, alpha: 1 },
		},
	})
		.png()
		.toBuffer();

	const result = await decodeServerHeicImage(testBuffer, {
		targetFormat: "webp",
		quality: 90,
		maxDimension: 2048,
		generateThumbnail: true,
		thumbnailSize: 200,
	});

	assert.equal(result.success, true);
	assert.equal(result.format, "webp");
	assert.equal(result.width, 800);
	assert.equal(result.height, 600);
	assert.ok(result.buffer.length > 0);
	assert.ok(result.thumbnailBuffer && result.thumbnailBuffer.length > 0);
	assert.ok(result.durationMs >= 0);
});

test("serverHeicDecoder downscales oversized images above maxDimension", async () => {
	// Create 3000x2000 image
	const testBuffer = await sharp({
		create: {
			width: 3000,
			height: 2000,
			channels: 4,
			background: { r: 255, g: 255, b: 255, alpha: 1 },
		},
	})
		.jpeg()
		.toBuffer();

	const result = await decodeServerHeicImage(testBuffer, {
		targetFormat: "webp",
		maxDimension: 2048,
	});

	assert.equal(result.success, true);
	assert.ok(result.width <= 2048, `Width ${result.width} should be <= 2048`);
	assert.ok(result.height <= 2048, `Height ${result.height} should be <= 2048`);
});
