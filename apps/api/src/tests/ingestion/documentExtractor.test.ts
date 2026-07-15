import assert from "node:assert";
import { describe, test } from "node:test";
import type { DocumentIngestionRequest } from "@dental/shared";
import { extractDocument } from "../../ingestion/documentExtractor.js";

describe("documentExtractor", () => {
	describe("extractDocument", () => {
		test("extracts plain text provided via rawText", () => {
			const request: DocumentIngestionRequest = {
				fileName: "test.txt",
				rawText: "Hello world!   \n\n This is a test. \n\n\n\n ",
				target: "plain_text",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #A6ED0C785D45.txt");
			assert.strictEqual(result.detectedKind, "txt");
			assert.strictEqual(
				result.extractedText,
				"Hello world!\n\n This is a test.",
			);
			assert.strictEqual(result.rowCount, 2);
			assert.strictEqual(result.tableCount, 0);
			assert.ok(
				result.routes.some(
					(route) => route.target === "plain_text" && route.enabled,
				),
			);
		});

		test("extracts simple text file provided via fileBase64", () => {
			// "File content in base64" -> "RmlsZSBjb250ZW50IGluIGJhc2U2NA=="
			const request: DocumentIngestionRequest = {
				fileName: "test_file.csv",
				fileBase64: "RmlsZSBjb250ZW50IGluIGJhc2U2NA==", // "File content in base64"
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #AAA0FF649053.csv");
			assert.strictEqual(result.detectedKind, "csv");
			assert.strictEqual(result.extractedText, "File content in base64");
			assert.strictEqual(result.byteSize, 22);
		});

		test("handles JSON known format", () => {
			const jsonContent = '{"key": "value"}';
			const base64Content = Buffer.from(jsonContent).toString("base64");
			const request: DocumentIngestionRequest = {
				fileName: "data.json",
				fileBase64: base64Content,
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #99377C63FBE5.json");
			assert.strictEqual(result.detectedKind, "json");
			assert.strictEqual(result.extractedText, '{"key": "value"}');
		});

		test("handles PDF format", () => {
			const pdfPrefix = "%PDF-1.4\n";
			const base64Content = Buffer.from(pdfPrefix).toString("base64");

			const request: DocumentIngestionRequest = {
				fileName: "document.pdf",
				fileBase64: base64Content,
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #5CF35F3F6FF8.pdf");
			assert.strictEqual(result.detectedKind, "pdf");
			assert.ok(result.warnings.includes("pdf_best_effort_no_ocr"));
			assert.ok(
				result.warnings.includes("pdf_text_not_extracted_may_be_scanned"),
			);
			assert.strictEqual(result.quality.extractionQuality, "ocr_required");
		});

		test("handles image format", () => {
			const base64Content = Buffer.from("fake image data").toString("base64");

			const request: DocumentIngestionRequest = {
				fileName: "photo.jpg",
				fileBase64: base64Content,
				target: "pricelist",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #AFF6100BD4DF.jpg");
			assert.strictEqual(result.detectedKind, "image");
			assert.ok(result.warnings.includes("image_requires_ocr_or_vision"));
			assert.strictEqual(result.quality.extractionQuality, "ocr_required");
		});

		test("handles legacy database format", () => {
			const base64Content = Buffer.from("SQLite format 3\u0000").toString(
				"base64",
			);

			const request: DocumentIngestionRequest = {
				fileName: "database.sqlite",
				fileBase64: base64Content,
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.detectedKind, "legacy_database");
			assert.ok(
				result.extractedText.includes(
					"Источник старой базы: база SQLite Источник миграции",
				),
			);
			assert.ok(result.extractedText.includes("Тип источника: старая база"));
			assert.ok(
				result.warnings.includes("legacy_source_staging_manifest_only"),
			);
		});

		test("truncates large text strings", () => {
			const maxExtractedTextChars = 280_000;
			const largeText = "A".repeat(300_000);

			const request: DocumentIngestionRequest = {
				fileName: "large.txt",
				rawText: largeText,
				target: "plain_text",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.extractedText.length, maxExtractedTextChars);
			assert.ok(result.warnings.includes("extracted_text_truncated"));
		});

		test("decodes unknown format as text", () => {
			const base64Content = Buffer.from(
				"some text in an unknown extension",
			).toString("base64");

			const request: DocumentIngestionRequest = {
				fileName: "mystery.xyz",
				fileBase64: base64Content,
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.detectedKind, "unknown");
			assert.strictEqual(
				result.extractedText,
				"some text in an unknown extension",
			);
			assert.ok(result.warnings.includes("unknown_format_decoded_as_text"));
		});
	});
});
