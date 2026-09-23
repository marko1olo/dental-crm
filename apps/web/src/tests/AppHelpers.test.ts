import assert from "node:assert";
import { describe, it, test } from "node:test";
import {
	assertSpeechChunkDbStores,
	classifyBrowserImagingFileName,
	requiredSpeechChunkDbStoreNames,
} from "../AppHelpers.js";

describe("classifyBrowserImagingFileName", () => {
	test('returns "dicom" for dicom files', () => {
		assert.strictEqual(classifyBrowserImagingFileName("scan.dcm"), "dicom");
	});

	test('returns "dicom" for KaVo OP300 / Instrumentarium extensionless CBCT slices', () => {
		assert.strictEqual(classifyBrowserImagingFileName("I0000001"), "dicom");
		assert.strictEqual(classifyBrowserImagingFileName("I0000382"), "dicom");
		assert.strictEqual(classifyBrowserImagingFileName("IMGDATA/20260903/I0000408"), "dicom");
		assert.strictEqual(classifyBrowserImagingFileName("Data\\slice_042"), "dicom");

		// Buffer with DICM magic at offset 128
		const dicmBuf = new Uint8Array(140);
		dicmBuf[128] = 0x44; // D
		dicmBuf[129] = 0x49; // I
		dicmBuf[130] = 0x43; // C
		dicmBuf[131] = 0x4d; // M
		assert.strictEqual(classifyBrowserImagingFileName("arbitrary_name", dicmBuf), "dicom");
	});

	test('returns "archive" for archive files', () => {
		assert.strictEqual(classifyBrowserImagingFileName("scans.zip"), "archive");
	});

	test('returns "model" for 3D model files', () => {
		assert.strictEqual(classifyBrowserImagingFileName("jaw.stl"), "model");
		assert.strictEqual(classifyBrowserImagingFileName("jaw.obj"), "model");
		assert.strictEqual(classifyBrowserImagingFileName("jaw.ply"), "model");
	});

	test('returns "image" for image files', () => {
		assert.strictEqual(classifyBrowserImagingFileName("photo.jpg"), "image");
		assert.strictEqual(classifyBrowserImagingFileName("photo.jpeg"), "image");
		assert.strictEqual(classifyBrowserImagingFileName("photo.png"), "image");
	});

	test('returns "other" for unmatched extensions or no extensions', () => {
		assert.strictEqual(classifyBrowserImagingFileName("document.pdf"), "other");
		assert.strictEqual(classifyBrowserImagingFileName("notes.txt"), "other");
		assert.strictEqual(classifyBrowserImagingFileName("data.csv"), "other");
		assert.strictEqual(
			classifyBrowserImagingFileName("no_extension_file"),
			"other",
		);
		assert.strictEqual(classifyBrowserImagingFileName(".hidden_file"), "other");
		assert.strictEqual(classifyBrowserImagingFileName(""), "other");
	});

	test("handles case insensitivity correctly", () => {
		assert.strictEqual(classifyBrowserImagingFileName("SCAN.DCM"), "dicom");
		assert.strictEqual(classifyBrowserImagingFileName("scans.ZIP"), "archive");
		assert.strictEqual(classifyBrowserImagingFileName("JAW.STL"), "model");
		assert.strictEqual(classifyBrowserImagingFileName("PHOTO.PNG"), "image");
	});

	test("handles filenames with multiple dots correctly", () => {
		assert.strictEqual(classifyBrowserImagingFileName("scan.001.dcm"), "dicom");
		assert.strictEqual(
			classifyBrowserImagingFileName("archive.tar.gz"),
			"other",
		);
		assert.strictEqual(
			classifyBrowserImagingFileName("model.final.v2.obj"),
			"model",
		);
		assert.strictEqual(
			classifyBrowserImagingFileName("photo.edited.jpg"),
			"image",
		);
	});
});

describe("assertSpeechChunkDbStores", () => {
	it("does not throw when all required stores are present", () => {
		const mockDb = {
			objectStoreNames: {
				contains: (storeName: string) =>
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					requiredSpeechChunkDbStoreNames.includes(storeName as any),
			},
		} as unknown as IDBDatabase;

		assert.doesNotThrow(() => assertSpeechChunkDbStores(mockDb));
	});

	it("throws an error when one required store is missing", () => {
		const missingStore = requiredSpeechChunkDbStoreNames[0];
		const mockDb = {
			objectStoreNames: {
				contains: (storeName: string) => {
					if (storeName === missingStore) return false;
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					return requiredSpeechChunkDbStoreNames.includes(storeName as any);
				},
			},
		} as unknown as IDBDatabase;

		assert.throws(() => assertSpeechChunkDbStores(mockDb), {
			message: `Offline IndexedDB schema is missing stores: ${missingStore}`,
		});
	});

	it("throws an error when multiple required stores are missing", () => {
		const missingStores = [
			requiredSpeechChunkDbStoreNames[0],
			requiredSpeechChunkDbStoreNames[1],
		];
		const mockDb = {
			objectStoreNames: {
				contains: (storeName: string) => {
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					if (missingStores.includes(storeName as any)) return false;
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					return requiredSpeechChunkDbStoreNames.includes(storeName as any);
				},
			},
		} as unknown as IDBDatabase;

		assert.throws(() => assertSpeechChunkDbStores(mockDb), {
			message: `Offline IndexedDB schema is missing stores: ${missingStores.join(", ")}`,
		});
	});
});
