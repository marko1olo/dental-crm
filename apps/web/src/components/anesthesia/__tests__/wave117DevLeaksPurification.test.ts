/**
 * wave117DevLeaksPurification.test.ts
 *
 * DENTE Dental CRM — Unit tests for Wave 117 Dev Leaks & Synthetic Mocks Purification (Mandates 8a–8q).
 * Ensures zero internal prompt references ("Мандат 8e") in client-facing UI and production engines,
 * eliminates synthetic staff mocks in App, PatientBillingModal, AnesthesiaProtocolModal, and sickLeaveElnEngine,
 * and standardizes document titles to dental medical record (Медицинская карта приёма).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { generateForm036uEntry } from "../../documents/sickLeave/sickLeaveElnEngine.js";

describe("Wave 117: Dev Leaks & Synthetic Staff Mocks Purification (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../../../..");

	it("1. NurseCarpuleDisposalModal: absence of «Мандат 8e» and presence of pure clinical SanPiN reference", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/inventory/NurseCarpuleDisposalModal.tsx",
		);
		if (!fs.existsSync(filePath)) {
			// Successfully eradicated micro-tracking antipattern modal per Mandate 8k (CRM != Reality Simulator)
			assert.ok(
				!fs.existsSync(filePath),
				"NurseCarpuleDisposalModal has been completely eradicated",
			);
			return;
		}
		const content = fs.readFileSync(filePath, "utf-8");

		// No dev leak text "Мандат 8e" in UI/labels
		assert.ok(
			!content.includes("Мандат 8e"),
			"NurseCarpuleDisposalModal must NOT leak prompt text 'Мандат 8e'",
		);

		// Clean medical regulatory citations
		assert.ok(
			content.includes(
				"СанПиН 3.3686-21 • Врачом, администратором или медсестрой (без комиссии из 3 человек)",
			),
			"NurseCarpuleDisposalModal must use pure regulatory citation",
		);

		assert.ok(
			content.includes(
				"СанПиН 3.3686-21 Быстрая утилизация врачом/админом (без комиссии из 3 человек)",
			),
			"Disposal title must be clean without mandate references",
		);
	});

	it("2. chairsideConsentEngine: absence of «Мандат 8e» in legalStampText and pure 323-FZ / 1051n citation", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/chairside/chairsideConsentEngine.ts",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("Мандат 8e"),
			"chairsideConsentEngine must NOT contain prompt text 'Мандат 8e'",
		);

		assert.ok(
			content.includes(
				"ЛИЧНОЕ СОГЛАСИЕ В ПРИСУТСТВИИ ПАЦИЕНТА В КРЕСЛЕ (ст. 20 323-ФЗ, Приказ МЗ РФ № 1051н)",
			),
			"legalStampText must strictly follow official regulatory citation without prompt references",
		);
	});

	it("3. App.tsx / AppTopBar.tsx: absence of synthetic doctor mocks «Смирнов Олег Игоревич» and «Смирнов Алексей Петрович»", () => {
		const filePath = path.join(repoRoot, "apps/web/src/App.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		const topBarPath = path.join(
			repoRoot,
			"apps/web/src/components/appLayout/AppTopBar.tsx",
		);
		const topBarModulesPath = path.join(
			repoRoot,
			"apps/web/src/components/appLayout/topBarModules/TopBarModalsHost.tsx",
		);
		const topBarContent = `${fs.existsSync(topBarPath) ? fs.readFileSync(topBarPath, "utf-8") : ""}\n${fs.existsSync(topBarModulesPath) ? fs.readFileSync(topBarModulesPath, "utf-8") : ""}`;
		const combined = `${content}\n${topBarContent}`;

		assert.ok(
			!combined.includes("Смирнов Олег Игоревич"),
			"App.tsx/AppTopBar.tsx must not contain synthetic doctor mock 'Смирнов Олег Игоревич'",
		);
		assert.ok(
			!combined.includes("Смирнов Алексей Петрович"),
			"App.tsx/AppTopBar.tsx must not contain synthetic doctor mock 'Смирнов Алексей Петрович'",
		);
		assert.ok(
			combined.includes('activeDoctor?.fullName || "Лечащий врач"'),
			"App.tsx/AppTopBar.tsx must use neutral fallback 'Лечащий врач'",
		);
	});

	it("4. PatientBillingModal.tsx: absence of synthetic doctor mock «Кузнецов П. С.» in completed acts", () => {
		const modalPath = path.join(
			repoRoot,
			"apps/web/src/components/finance/PatientBillingModal.tsx",
		);
		const dataPath = path.join(
			repoRoot,
			"apps/web/src/components/finance/usePatientBillingData.ts",
		);
		const modalContent = fs.readFileSync(modalPath, "utf-8");
		const dataContent = fs.existsSync(dataPath)
			? fs.readFileSync(dataPath, "utf-8")
			: modalContent;

		assert.ok(
			!modalContent.includes("Кузнецов П. С.") &&
				!dataContent.includes("Кузнецов П. С."),
			"PatientBillingModal.tsx must not contain synthetic mock 'Кузнецов П. С.'",
		);
		assert.ok(
			dataContent.includes('fullName: doctor?.fullName || "Лечащий врач"') ||
				modalContent.includes('fullName: doctor?.fullName || "Лечащий врач"'),
			"PatientBillingModal.tsx / usePatientBillingData.ts must use neutral fallback 'Лечащий врач'",
		);
	});

	it("5. sickLeaveElnEngine.ts: absence of «Иванова Е.В.» and «Соколов А.М.» as fallback staff names", () => {
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

		assert.ok(
			!content.includes("Иванова Е.В."),
			"sickLeaveElnEngine.ts must not contain synthetic default 'Иванова Е.В.'",
		);
		assert.ok(
			!content.includes("Соколов А.М."),
			"sickLeaveElnEngine.ts must not contain synthetic default 'Соколов А.М.'",
		);
		assert.ok(
			content.includes("Председатель ВК") && content.includes("Лечащий врач"),
			"sickLeaveElnEngine.ts must use clinical fallbacks 'Председатель ВК' and 'Лечащий врач'",
		);

		// Functional check of generateForm036uEntry with minimal data
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

		assert.equal(
			entry.chairpersonSign,
			"Лечащий врач",
			"Fallback for non-VK sick leave entry must be 'Лечащий врач'",
		);
	});

	it("6. Anesthesia cluster: AnesthesiaProtocolModal is eradicated, AnesthesiaQuickBar has zero synthetic nurse leaks", () => {
		const modalPath = path.join(
			repoRoot,
			"apps/web/src/components/anesthesia/AnesthesiaProtocolModal.tsx",
		);
		assert.ok(
			!fs.existsSync(modalPath),
			"AnesthesiaProtocolModal.tsx must be eradicated (Wave 197)",
		);

		const quickBarPath = path.join(
			repoRoot,
			"apps/web/src/components/anesthesia/AnesthesiaQuickBar.tsx",
		);
		const content = fs.readFileSync(quickBarPath, "utf-8");
		assert.ok(
			!content.includes("Смирнова А. В."),
			"AnesthesiaQuickBar.tsx must not leak synthetic nurse 'Смирнова А. В.'",
		);
	});

	it("7. documentQuery.ts: absence of «003-В/у» and presence of dental extract title without hospital bureaucracy", () => {
		const filePath = path.join(repoRoot, "apps/api/src/db/documentQuery.ts");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("003-В/у"),
			"documentQuery.ts must not contain hospital form code '003-В/у'",
		);
		assert.ok(
			content.includes("Выписка из медицинской карты стоматологического пациента"),
			"documentQuery.ts must use semantic dental extract title",
		);
	});

	it("8. forms003vu.ts: absence of Soviet order 1030 and presence of clean clinical standard", () => {
		const filePath = path.join(
			repoRoot,
			"packages/shared/src/documents/forms003vu.ts",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		// Total ban on Soviet Order 1030 (Mandates 8x, 8ao)
		assert.ok(
			!content.includes("Приказ Минздрава СССР № 1030"),
			"forms003vu.ts must NOT reference USSR MoH Order 1030",
		);
		assert.ok(
			!content.includes("USSR Order 1030"),
			"forms003vu.ts must NOT reference USSR Order 1030",
		);
		assert.ok(
			content.includes(
				"ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА",
			),
			"forms003vu.ts header must state clean dental patient extract title",
		);
		assert.ok(
			content.includes("а не госпитальная форма 003/у"),
			"forms003vu.ts must explicitly distinguish from hospital form 003/u",
		);
	});
});
