import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	exportDoseJournalToCsv,
	generateDoseSheetHtml,
} from "../doseSheet/radiationDoseEngine.js";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

const TARGET_FILES = [
	"components/imaging/DicomViewerModal.tsx",
	"components/radiology/doseSheet/radiationDoseEngine.ts",
	"components/documents/forms/RadiationDoseSheetForm.tsx",
	"components/photography/ClinicalPhotoProtocolModal.tsx",
	"components/photography/BeforeAfterComparisonView.tsx",
];

const FORBIDDEN_SYNTHETIC_NAME = "Иванов Иван Иванович";

test("Wave 107 (Mandate 8b & 8e): Исходный код 5 целевых файлов очищен от синтетического имени 'Иванов Иван Иванович'", () => {
	for (const relativePath of TARGET_FILES) {
		const fullPath = path.join(webSrcRoot, relativePath);
		const content = readFileSync(fullPath, "utf8");

		assert.ok(
			!content.includes(FORBIDDEN_SYNTHETIC_NAME),
			`Файл ${relativePath} не должен содержать синтетическое имя '${FORBIDDEN_SYNTHETIC_NAME}'`,
		);
	}
});

test("Wave 107: generateDoseSheetHtml по умолчанию не подставляет синтетическое имя 'Иванов Иван Иванович'", () => {
	const html = generateDoseSheetHtml([], {});
	assert.ok(
		!html.includes(FORBIDDEN_SYNTHETIC_NAME),
		"generateDoseSheetHtml без параметров не должен содержать синтетическое имя",
	);

	const htmlWithPatient = generateDoseSheetHtml([], {
		patientFullName: "Сидорова Анна Павловна",
	});
	assert.ok(
		htmlWithPatient.includes("Сидорова Анна Павловна"),
		"generateDoseSheetHtml с явным ФИО пациента должен выводить переданное имя",
	);
});

test("Wave 107: exportDoseJournalToCsv по умолчанию не подставляет синтетическое имя 'Иванов Иван Иванович'", () => {
	const csv = exportDoseJournalToCsv([], {});
	assert.ok(
		!csv.includes(FORBIDDEN_SYNTHETIC_NAME),
		"exportDoseJournalToCsv без параметров не должен содержать синтетическое имя",
	);

	const csvWithPatient = exportDoseJournalToCsv([], {
		patientFullName: "Петров Василий Сергеевич",
	});
	assert.ok(
		csvWithPatient.includes("Петров Василий Сергеевич"),
		"exportDoseJournalToCsv с явным ФИО пациента должен выводить переданное имя",
	);
});

test("Wave 199 (Mandate 8s): RadiationDoseSheetModal.tsx искоренен в пользу RadiationDoseSheetForm.tsx", () => {
	const modalPath = path.join(webSrcRoot, "components/radiology/doseSheet/RadiationDoseSheetModal.tsx");
	assert.strictEqual(
		existsSync(modalPath),
		false,
		"RadiationDoseSheetModal.tsx должен быть удален из кодовой базы в пользу RadiationDoseSheetForm.tsx",
	);
	const canonicalFormPath = path.join(webSrcRoot, "components/documents/forms/RadiationDoseSheetForm.tsx");
	assert.strictEqual(
		existsSync(canonicalFormPath),
		true,
		"Канонический SSOT RadiationDoseSheetForm.tsx обязан присутствовать в кодовой базе",
	);
});

