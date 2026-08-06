import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import type { ImportPreviewRequest } from "@dental/shared";
import { db } from "../db/client.js";
import { buildPatientImportIntake } from "./imports.js";

/**
 * buildPatientImportIntake стала асинхронной и принимает организацию первым
 * аргументом: preview ищет дубли среди уже заведённых пациентов клиники.
 *
 * Тесты звали её по старой сигнатуре — одним аргументом и без await, — поэтому
 * input попадал на место orgId, сам input оказывался undefined, а в result
 * лежал Promise. Отсюда `undefined !== 'test-source'` и падения на чтении
 * свойств у undefined.
 *
 * db.select подменяется, чтобы проверка дублей не требовала живой базы:
 * db — обычный объект, его свойство подменяется штатно (в отличие от
 * пространства имён ES-модуля).
 */
const ORG_ID = "123e4567-e89b-12d3-a456-4266141740ff";

describe("buildPatientImportIntake", () => {
	beforeEach(() => {
		// Ни одного заведённого пациента: дублей нет, поведение детерминировано.
		mock.method(db, "select", () => ({
			from: () => ({ where: async () => [] }),
		}));
	});

	afterEach(() => {
		mock.restoreAll();
	});

	test("processes unstructured text and normalizes it", async () => {
		const input: ImportPreviewRequest = {
			sourceName: "test-source",
			sourceKind: "free_text",
			rawText: "Иванов Иван Иванович 89001234567 01.01.1990 жалоба на боль",
		};

		const result = await buildPatientImportIntake(ORG_ID, input);

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

	test("processes image_ocr source and appends recognition notes", async () => {
		const input: ImportPreviewRequest = {
			sourceName: "ocr-source",
			sourceKind: "image_ocr",
			rawText: "Петров Петр 89111234567",
		};

		const result = await buildPatientImportIntake(ORG_ID, input);

		assert.strictEqual(result.recognitionNotes.length, 3);
		const ocrNote = result.recognitionNotes[2];
		assert.ok(ocrNote);
		assert.ok(
			ocrNote.includes(
				"Фото журнала должно проходить OCR/vision worker; этот endpoint принимает распознанный текст и нормализует его.",
			),
		);
	});

	test("processes voice_dictation source and appends recognition notes", async () => {
		const input: ImportPreviewRequest = {
			sourceName: "voice-source",
			sourceKind: "voice_dictation",
			rawText: "Смирнова Анна 89221234567",
		};

		const result = await buildPatientImportIntake(ORG_ID, input);

		assert.strictEqual(result.recognitionNotes.length, 3);
		const voiceNote = result.recognitionNotes[2];
		assert.ok(voiceNote);
		assert.ok(
			voiceNote.includes(
				"Диктовка превращается в текст браузером или AI-worker, затем разбирается тем же безопасным preview.",
			),
		);
	});

	test("returns empty preview for empty rawText", async () => {
		const input: ImportPreviewRequest = {
			sourceName: "empty-source",
			sourceKind: "free_text",
			rawText: "   \n\r\n   ",
		};

		const result = await buildPatientImportIntake(ORG_ID, input);
		assert.strictEqual(result.preview.totalRows, 0);
	});
});
