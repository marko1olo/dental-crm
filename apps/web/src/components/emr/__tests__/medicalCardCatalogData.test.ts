/**
 * apps/web/src/components/emr/__tests__/medicalCardCatalogData.test.ts
 *
 * Red Team тест SSOT медицинской карты пациента, SOAP-дневников и каталога (Мандаты 8e, 8n, 8x, 8ap, 8am).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	DEFAULT_32_PERMANENT_TEETH,
	DEFAULT_MEDICAL_CARD_DATA,
	DEFAULT_043_DATA,
	DEFAULT_CLINICAL_DIARY_DATA,
	resolveClinicRequisites,
	applyMedicalCardPhysiologicalNorm,
	applyForm043PhysiologicalNorm,
} from "../medicalCardCatalogData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Medical Card & SOAP Diary SSOT (Mandates 8e, 8n, 8x, 8ap, 8am)", () => {
	it("1. DEFAULT_32_PERMANENT_TEETH contains exactly 32 healthy FDI teeth", () => {
		assert.strictEqual(DEFAULT_32_PERMANENT_TEETH.length, 32);
		for (const tooth of DEFAULT_32_PERMANENT_TEETH) {
			assert.strictEqual(tooth.statusCode, "healthy");
			assert.ok(tooth.toothNumber >= 11 && tooth.toothNumber <= 48);
		}
	});

	it("2. DEFAULT_MEDICAL_CARD_DATA has clean domain language without raw order codes in title", () => {
		assert.strictEqual(DEFAULT_MEDICAL_CARD_DATA.formNumber, "Медицинская карта приёма");
		assert.strictEqual(DEFAULT_MEDICAL_CARD_DATA.formOrderName, "Медицинская карта стоматологического пациента");
		assert.strictEqual(DEFAULT_043_DATA, DEFAULT_MEDICAL_CARD_DATA);
		assert.strictEqual(DEFAULT_CLINICAL_DIARY_DATA, DEFAULT_MEDICAL_CARD_DATA);
		assert.ok(DEFAULT_MEDICAL_CARD_DATA.dentalStatus.odontogramTeeth.length === 32);
		assert.strictEqual(DEFAULT_MEDICAL_CARD_DATA.dentalStatus.biteType, "orthognathic");
		assert.strictEqual(DEFAULT_MEDICAL_CARD_DATA.dentalStatus.oralMucosaStatus.color, "pale_pink_normal");
	});

	it("3. applyMedicalCardPhysiologicalNorm applies 1-click norm without erasing custom complaints", () => {
		const emptyCard = { ...DEFAULT_MEDICAL_CARD_DATA };
		const withNorm = applyMedicalCardPhysiologicalNorm(emptyCard);

		assert.ok(withNorm.anamnesis.chiefComplaint.includes("санация"));
		assert.ok(withNorm.anamnesis.concomitantSomaticDiseases.includes("Соматически здоров"));
		assert.ok(withNorm.anamnesis.allergologicalHistory.includes("не отягощен"));
		assert.strictEqual(withNorm.dentalStatus.oralMucosaStatus.color, "pale_pink_normal");

		// Non-destructive: preserves existing patient text
		const customComplaintCard = {
			...emptyCard,
			anamnesis: {
				...emptyCard.anamnesis,
				chiefComplaint: "Острая боль в зубе 36 при накусывании",
			},
		};
		const preserved = applyForm043PhysiologicalNorm(customComplaintCard);
		assert.strictEqual(preserved.anamnesis.chiefComplaint, "Острая боль в зубе 36 при накусывании");
		assert.ok(preserved.anamnesis.concomitantSomaticDiseases.includes("Соматически здоров"));
	});

	it("4. resolveClinicRequisites provides safe defaults and merges clinic profile seamlessly", () => {
		const reqs = resolveClinicRequisites(undefined, {
			clinicName: "Клиника Доктора Тестова",
			phone: "+7 999 111-22-33",
		});
		assert.strictEqual(reqs.clinicName, "Клиника Доктора Тестова");
		assert.strictEqual(reqs.clinicPhone, "+7 999 111-22-33");
		assert.strictEqual(reqs.clinicLegalName, "Клиника Доктора Тестова");
	});

	it("5. DirectEmrLauncher source code is mounted and responds to canonical deep links", () => {
		const launcherPath = path.resolve(__dirname, "../DirectEmrLauncher.tsx");
		assert.ok(fs.existsSync(launcherPath), "DirectEmrLauncher.tsx must exist");
		const code = fs.readFileSync(launcherPath, "utf8");

		assert.ok(code.includes("medical-card"));
		assert.ok(code.includes("emr"));
		assert.ok(code.includes("card-043"));
		assert.ok(code.includes("dente:open-medical-card"));
		assert.ok(code.includes("MedicalCardPrintModal"));
	});

	it("6. AppShell mounts both DirectVisitLauncher and DirectEmrLauncher in live UI (Mandate 8aq)", () => {
		const appShellPath = path.resolve(__dirname, "../../../AppShell.tsx");
		const appShellCode = fs.readFileSync(appShellPath, "utf8");

		assert.ok(appShellCode.includes("<DirectVisitLauncher />"));
		assert.ok(appShellCode.includes("<DirectEmrLauncher />"));
	});

	it("7. Primary CTA button in EMR styles enforces single #0d9488 (var(--teal)) (Mandate 8am)", () => {
		const cssPath = path.resolve(__dirname, "../emrStyles/emrLayoutAndHeader.css");
		const cssCode = fs.readFileSync(cssPath, "utf8");

		assert.ok(cssCode.includes("var(--teal, #0d9488)"));
		assert.ok(!cssCode.includes("#0284c7")); // Sky blue eradicated in favor of canonical Teal
	});
});
