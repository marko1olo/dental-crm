/**
 * wave117StaffMocksPurification.test.ts
 * Tests for Wave 117 Staff Mocks Purification (Mandates 8a–8q, 8b <= 120 lines).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { generateForm036uEntry } from "../../documents/sickLeave/sickLeaveElnEngine.js";

describe("Wave 117: Staff Mocks Purification (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../../../..");

	it("4. PatientBillingModal.tsx: absence of synthetic doctor mock «Кузнецов П. С.» in completed acts", () => {
		const modalPath = path.join(repoRoot, "apps/web/src/components/finance/PatientBillingModal.tsx");
		const dataPath = path.join(repoRoot, "apps/web/src/components/finance/usePatientBillingData.ts");
		const modalContent = fs.readFileSync(modalPath, "utf-8");
		const dataContent = fs.existsSync(dataPath) ? fs.readFileSync(dataPath, "utf-8") : modalContent;

		assert.ok(
			!modalContent.includes("Кузнецов П. С.") && !dataContent.includes("Кузнецов П. С."),
			"PatientBillingModal.tsx must not contain synthetic mock 'Кузнецов П. С.'",
		);
		assert.ok(
			dataContent.includes('fullName: doctor?.fullName || "Лечащий врач"') ||
				modalContent.includes('fullName: doctor?.fullName || "Лечащий врач"'),
			"Must use neutral fallback 'Лечащий врач'",
		);
	});

	it("5. sickLeaveElnEngine.ts: absence of synthetic staff names and clinical fallbacks", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/documents/sickLeave/sickLeaveElnEngine.ts",
		);
		let content = fs.readFileSync(filePath, "utf-8");
		const modulePath = path.join(
			repoRoot,
			"apps/web/src/components/documents/sickLeave/elnEngineModules/elnEmrSnippet.ts",
		);
		if (fs.existsSync(modulePath)) {
			content += "\n" + fs.readFileSync(modulePath, "utf-8");
		}

		assert.ok(!content.includes("Иванова Е.В."), "Must not contain 'Иванова Е.В.'");
		assert.ok(!content.includes("Соколов А.М."), "Must not contain 'Соколов А.М.'");
		assert.ok(
			content.includes("Председатель ВК") && content.includes("Лечащий врач"),
			"Must use clinical fallbacks 'Председатель ВК' and 'Лечащий врач'",
		);

		const entry = generateForm036uEntry(
			{
				elnNumber: "999000111222",
				issueDate: "2026-09-11",
				isDuplicate: false,
				reasonCode: "01",
				regimeType: "ambulatory",
				icd10Code: "K04.0",
				diagnosisText: "Острый пульпит",
				closingCode: "31",
				isVkRequired: false,
				organizationName: "Стоматологическая клиника",
				organizationOgrn: "1234567890123",
				organizationAddress: "г. Москва",
				medicalLicenceNumber: "ЛО-77-01-012345",
				periods: [
					{
						id: "period-1",
						dateFrom: "2026-09-11",
						dateTo: "2026-09-15",
						doctorSpecialty: "Врач-стоматолог",
						doctorFio: "",
						doctorSnils: "123-456-789 00",
						doctorRole: "attending",
					},
				],
			},
			{
				patientFio: "Тестовый Пациент",
				patientBirthDate: "1990-01-01",
				patientSnils: "123-456-789 00",
				patientGender: "male",
				employerName: "ООО Тест",
				isPrimaryWorkplace: true,
			},
		);

		assert.equal(entry.chairpersonSign, "Лечащий врач");
	});
});
