import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import {
	InvalidMagicBytesError,
	LocalPacsStorageService,
	PathTraversalError,
	TenantIsolationError,
	detectImagingMagicBytes,
} from "../localPacsStorageService.js";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

describe("LocalPacsStorageService — Path Traversal & Tenant Isolation", () => {
	it("correctly resolves tenant storage directory and blocks traversal in organizationId", () => {
		const dirA = LocalPacsStorageService.getTenantStorageDir(ORG_A);
		assert.ok(dirA.endsWith(ORG_A));

		assert.throws(() => {
			LocalPacsStorageService.getTenantStorageDir("../traversal");
		}, PathTraversalError);

		assert.throws(() => {
			LocalPacsStorageService.getTenantStorageDir("..\\traversal");
		}, PathTraversalError);

		assert.throws(() => {
			LocalPacsStorageService.getTenantStorageDir("org/subfolder");
		}, PathTraversalError);

		assert.throws(() => {
			LocalPacsStorageService.getTenantStorageDir("org\0null");
		}, PathTraversalError);

		assert.throws(() => {
			LocalPacsStorageService.getTenantStorageDir("");
		}, TenantIsolationError);
	});

	it("strictly resolves files within tenant directory and blocks Path Traversal", () => {
		const safePath = LocalPacsStorageService.resolveTenantStoragePath(ORG_A, "scan_1.dcm");
		const tenantDir = LocalPacsStorageService.getTenantStorageDir(ORG_A);
		assert.strictEqual(safePath, path.resolve(tenantDir, "scan_1.dcm"));

		// Traversal with ../
		assert.throws(() => {
			LocalPacsStorageService.resolveTenantStoragePath(ORG_A, "../other-patient.dcm");
		}, PathTraversalError);

		// Traversal with ..\
		assert.throws(() => {
			LocalPacsStorageService.resolveTenantStoragePath(ORG_A, "..\\..\\secret.key");
		}, PathTraversalError);

		// URL-encoded traversal %2e%2e
		assert.throws(() => {
			LocalPacsStorageService.resolveTenantStoragePath(ORG_A, "%2e%2e/forbidden.dcm");
		}, PathTraversalError);

		// Null byte injection
		assert.throws(() => {
			LocalPacsStorageService.resolveTenantStoragePath(ORG_A, "scan.dcm\0.png");
		}, PathTraversalError);

		// Absolute path escaping tenant dir
		const tenantDirB = LocalPacsStorageService.getTenantStorageDir(ORG_B);
		const crossTenantFile = path.join(tenantDirB, "secret_b.dcm");
		assert.throws(() => {
			LocalPacsStorageService.resolveTenantStoragePath(ORG_A, crossTenantFile);
		}, PathTraversalError);
	});
});

describe("LocalPacsStorageService — Magic Bytes Detection", () => {
	it("detects PNG magic bytes", () => {
		const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
		assert.strictEqual(detectImagingMagicBytes(png), "png");
	});

	it("detects JPEG magic bytes", () => {
		const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
		assert.strictEqual(detectImagingMagicBytes(jpeg), "jpeg");
	});

	it("detects DICOM standard preamble with DICM", () => {
		const dicom = Buffer.alloc(132);
		dicom.write("DICM", 128, "latin1");
		assert.strictEqual(detectImagingMagicBytes(dicom), "dicom");
	});

	it("detects preamble-less DICOM with group 0x0002 or 0x0008", () => {
		const dicomNoPreamble = Buffer.from([0x02, 0x00, 0x00, 0x00, 0x55, 0x4c, 0x04, 0x00]);
		assert.strictEqual(detectImagingMagicBytes(dicomNoPreamble), "dicom");
	});

	it("detects HEIC format via ftyp box", () => {
		const heic = Buffer.alloc(32);
		heic.writeUInt32BE(24, 0); // box size
		heic.write("ftyp", 4, "latin1");
		heic.write("heic", 8, "latin1");
		assert.strictEqual(detectImagingMagicBytes(heic), "heic");
	});

	it("rejects invalid, text, or executable files", () => {
		const txt = Buffer.from("Hello world, this is a text file not an x-ray.");
		assert.strictEqual(detectImagingMagicBytes(txt), null);

		const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ executable
		assert.strictEqual(detectImagingMagicBytes(exe), null);
	});
});

describe("LocalPacsStorageService — Streaming Upload & Retrieval", () => {
	it("rejects files with invalid magic bytes and cleans up disk", async () => {
		const badBuffer = Buffer.from("NOT_A_DICOM_OR_IMAGE_FILE_JUST_RANDOM_TEXT");
		await assert.rejects(async () => {
			await LocalPacsStorageService.storeTenantFileBuffer(ORG_A, "malicious.exe", badBuffer);
		}, InvalidMagicBytesError);
	});

	it("stores valid DICOM file stream safely with sha256 and retrieves with correct mime", async () => {
		const dicomBuffer = Buffer.alloc(256);
		dicomBuffer.write("DICM", 128, "latin1");
		// Add some simulated slice data
		dicomBuffer.write("Simulated CBCT Slice Data", 140, "utf-8");

		const stored = await LocalPacsStorageService.storeTenantFileBuffer(
			ORG_A,
			"valid_cbct_slice.dcm",
			dicomBuffer,
		);

		assert.strictEqual(stored.detectedFormat, "dicom");
		assert.strictEqual(stored.fileSizeBytes, 256);
		assert.ok(stored.storagePath.includes(ORG_A));
		assert.strictEqual(
			stored.sha256,
			crypto.createHash("sha256").update(dicomBuffer).digest("hex"),
		);

		// Now retrieve file stream
		const retrieval = await LocalPacsStorageService.getTenantFileStream(ORG_A, stored.relativePath);
		assert.strictEqual(retrieval.mimeType, "application/dicom");
		assert.strictEqual(retrieval.fileSizeBytes, 256);
		assert.strictEqual(retrieval.isRange, false);

		// Read stream
		const chunks: Buffer[] = [];
		for await (const chunk of retrieval.stream) {
			chunks.push(chunk as Buffer);
		}
		const readData = Buffer.concat(chunks);
		assert.deepStrictEqual(readData, dicomBuffer);

		// Test range retrieval (bytes 128..131 should be DICM)
		const rangeRetrieval = await LocalPacsStorageService.getTenantFileStream(
			ORG_A,
			stored.relativePath,
			{ start: 128, end: 131 },
		);
		assert.strictEqual(rangeRetrieval.isRange, true);
		assert.strictEqual(rangeRetrieval.contentLength, 4);

		const rangeChunks: Buffer[] = [];
		for await (const chunk of rangeRetrieval.stream) {
			rangeChunks.push(chunk as Buffer);
		}
		const rangeData = Buffer.concat(rangeChunks);
		assert.strictEqual(rangeData.toString("latin1"), "DICM");

		// Clean up
		const deleted = await LocalPacsStorageService.deleteTenantFile(ORG_A, stored.relativePath);
		assert.strictEqual(deleted, true);
	});
});
