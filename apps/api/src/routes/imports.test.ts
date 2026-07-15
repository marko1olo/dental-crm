import assert from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import type { ImportPreviewRequest } from "@dental/shared";
import { buildPatientImportIntake } from "./imports.js";

describe("buildPatientImportIntake", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	test("processes unstructured text and normalizes it", () => {
		const input: ImportPreviewRequest = {
			sourceName: "test-source",
			sourceKind: "free_text",
			rawText: "Иванов Иван Иванович 89001234567 01.01.1990 жалоба на боль",
		};

		const result = buildPatientImportIntake(input);

		assert.strictEqual(result.sourceName, "test-source");
		assert.strictEqual(result.sourceKind, "free_text");
		assert.ok(
			result.normalizedText.includes("ФИО;Телефон;Дата рождения;Комментарий"),
		);
		assert.ok(
			result.normalizedText.includes(
				"Иванов Иван Иванович;+79001234567;1990-01-01;Иванов Иван Иванович 89001234567 01.01.1990 жалоба на боль",
			),
		);
		assert.strictEqual(result.recognitionNotes.length, 2); // Default notes
		assert.ok(result.preview);
	});

	test("processes image_ocr source and appends recognition notes", () => {
		const input: ImportPreviewRequest = {
			sourceName: "ocr-source",
			sourceKind: "image_ocr",
			rawText: "Петров Петр 89111234567",
		};

		const result = buildPatientImportIntake(input);

		assert.strictEqual(result.recognitionNotes.length, 3);
		assert.ok(
			result.recognitionNotes[2].includes(
				"Фото журнала должно проходить OCR/vision worker; этот endpoint принимает распознанный текст и нормализует его.",
			),
		);
	});

	test("processes voice_dictation source and appends recognition notes", () => {
		const input: ImportPreviewRequest = {
			sourceName: "voice-source",
			sourceKind: "voice_dictation",
			rawText: "Смирнова Анна 89221234567",
		};

		const result = buildPatientImportIntake(input);

		assert.strictEqual(result.recognitionNotes.length, 3);
		assert.ok(
			result.recognitionNotes[2].includes(
				"Диктовка превращается в текст браузером или AI-worker, затем разбирается тем же безопасным preview.",
			),
		);
	});

	test("returns empty preview for empty rawText", () => {
		const input: ImportPreviewRequest = {
			sourceName: "empty-source",
			sourceKind: "free_text",
			rawText: "   \n\r\n   ",
		};

		const result = buildPatientImportIntake(input);
		assert.strictEqual(result.preview.totalRows, 0);
	});
});
