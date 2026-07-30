import test from "node:test";
import assert from "node:assert/strict";
import { browserRenderableImageMimeType } from "./previewFormats";

test("browserRenderableImageMimeType", async (t) => {
	await t.test("returns null for null or undefined", () => {
		assert.equal(browserRenderableImageMimeType(null), null);
		assert.equal(browserRenderableImageMimeType(undefined), null);
	});

	await t.test("returns correct mime type for supported extensions", () => {
		assert.equal(browserRenderableImageMimeType("test.png"), "image/png");
		assert.equal(browserRenderableImageMimeType("test.jpg"), "image/jpeg");
		assert.equal(browserRenderableImageMimeType("test.jpeg"), "image/jpeg");
		assert.equal(browserRenderableImageMimeType("test.webp"), "image/webp");
		assert.equal(browserRenderableImageMimeType("test.gif"), "image/gif");
		assert.equal(browserRenderableImageMimeType("test.bmp"), "image/bmp");
	});

	await t.test("is case insensitive", () => {
		assert.equal(browserRenderableImageMimeType("test.PNG"), "image/png");
		assert.equal(browserRenderableImageMimeType("test.JPG"), "image/jpeg");
		assert.equal(browserRenderableImageMimeType("test.WebP"), "image/webp");
	});

	await t.test("returns null for unsupported or unknown extensions", () => {
		assert.equal(browserRenderableImageMimeType("test.dcm"), null);
		assert.equal(browserRenderableImageMimeType("test.zip"), null);
		assert.equal(browserRenderableImageMimeType("test.txt"), null);
		assert.equal(browserRenderableImageMimeType("test"), null);
	});
});
