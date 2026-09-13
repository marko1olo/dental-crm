import assert from "node:assert";
import { describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultPaidContract } from "../paidContractEngine";
import {
	DEFAULT_TELEGRAM_PREVIEW_PATIENT,
	buildDefaultTelegramPreview,
} from "../../settings/SettingsTelegramTab";

describe("Contracts, Prescriptions and Forms Mock Purity (Wave 107 - THE HAMMER, Mandates 8b & 8e)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const webSrcDir = path.resolve(__dirname, "../../..");

	const TARGET_FILES = [
		{
			name: "PrescriptionPrintModal.tsx",
			relativePath: "components/prescriptions/PrescriptionPrintModal.tsx",
			description: "Рецептурный бланк 107-1/у (Приказ Минздрава 1094н)",
		},
		{
			name: "paidContractEngine.ts",
			relativePath: "components/documents/paidContractEngine.ts",
			description: "Договор возмездного оказания стоматологических услуг (ПП РФ № 736)",
		},
		{
			name: "DailyDentistWorkSheet037uForm.tsx",
			relativePath: "components/documents/forms/DailyDentistWorkSheet037uForm.tsx",
			description: "Листок ежедневного учета работы врача-стоматолога Форма 037/у",
		},
		{
			name: "SettingsTelegramTab.tsx",
			relativePath: "components/settings/SettingsTelegramTab.tsx",
			description: "Шаблоны превью уведомлений Telegram",
		},
	];

	const SYNTHETIC_MOCK_NAME = "Иванов Иван Иванович";

	for (const target of TARGET_FILES) {
		test(`Absence of synthetic mock name '${SYNTHETIC_MOCK_NAME}' in ${target.name} (${target.description})`, () => {
			const fullPath = path.join(webSrcDir, target.relativePath);
			assert.ok(fs.existsSync(fullPath), `Файл должен существовать: ${target.relativePath}`);
			const content = fs.readFileSync(fullPath, "utf-8");

			assert.ok(
				!content.includes(SYNTHETIC_MOCK_NAME),
				`Файл ${target.name} не должен содержать синтетический мок '${SYNTHETIC_MOCK_NAME}'`,
			);
		});
	}

	test("Functional verification: PrescriptionPrintModal defaults patientName to empty string instead of mock", () => {
		const fullPath = path.join(webSrcDir, "components/prescriptions/PrescriptionPrintModal.tsx");
		const content = fs.readFileSync(fullPath, "utf-8");

		assert.ok(
			content.includes('const patientName = patient?.fullName || "";'),
			"В PrescriptionPrintModal patientName должен иметь дефолтное значение пустой строки",
		);
	});

	test("Functional verification: createDefaultPaidContract defaults patient.fullName to empty string for blank underlines (Mandate 8e)", () => {
		const defaultContract = createDefaultPaidContract({});
		assert.equal(
			defaultContract.patient.fullName,
			"",
			"В договоре по умолчанию patient.fullName обязан быть пустой строкой, а не фейковым ФИО",
		);
	});

	test("Functional verification: DailyDentistWorkSheet037uForm defaults doctorFullName to empty string", () => {
		const fullPath = path.join(
			webSrcDir,
			"components/documents/forms/DailyDentistWorkSheet037uForm.tsx",
		);
		const content = fs.readFileSync(fullPath, "utf-8");

		assert.ok(
			content.includes('initialPayload?.doctorFullName ?? ""'),
			"В DailyDentistWorkSheet037uForm doctorFullName обязан инициализироваться пустой строкой",
		);
	});

	test("Functional verification: SettingsTelegramTab DEFAULT_TELEGRAM_PREVIEW_PATIENT has empty fullName and buildDefaultTelegramPreview runs cleanly", () => {
		assert.equal(
			DEFAULT_TELEGRAM_PREVIEW_PATIENT.fullName,
			"",
			"DEFAULT_TELEGRAM_PREVIEW_PATIENT.fullName обязан быть пустой строкой",
		);

		const preview = buildDefaultTelegramPreview("appointment_confirmation");
		assert.ok(preview.text.length > 20, "Превью должно формироваться корректно");
		assert.ok(
			!preview.text.includes(SYNTHETIC_MOCK_NAME),
			"Текст превью не должен содержать синтетический мок ФИО",
		);
	});
});
