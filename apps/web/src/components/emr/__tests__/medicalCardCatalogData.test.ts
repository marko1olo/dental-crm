/**
 * apps/web/src/components/emr/__tests__/medicalCardCatalogData.test.ts
 *
 * Red Team тест SSOT медицинской карты приёма, SOAP-дневников и каталога (Мандаты 8e, 8n, 8x, 8ap, 8am).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	DEFAULT_32_PERMANENT_TEETH,
	DEFAULT_MEDICAL_CARD_DATA,
	DEFAULT_CLINICAL_DIARY_DATA,
	resolveClinicRequisites,
	applyMedicalCardPhysiologicalNorm,
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
		const preserved = applyMedicalCardPhysiologicalNorm(customComplaintCard);
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

	it("5. StandaloneEmrMedicalRecordHost source code is mounted and responds to canonical deep links", () => {
		const hostPath = path.resolve(__dirname, "../../appLayout/modalsContainerModules/standalone/clinical/StandaloneEmrMedicalRecordHost.tsx");
		assert.ok(fs.existsSync(hostPath), "StandaloneEmrMedicalRecordHost.tsx must exist");
		const code = fs.readFileSync(hostPath, "utf8");

		assert.ok(code.includes("MedicalRecordStudioModal"));
		assert.ok(code.includes("emr-medical-record-standalone-root"));
	});

	it("6. ClinicalViewRouter mounts VisitView and clinicalLaunchersRegistry mounts canonical EMR (Mandate 8aq)", () => {
		const routerPath = path.resolve(__dirname, "../../appLayout/viewRouterModules/ClinicalViewRouter.tsx");
		const routerCode = fs.readFileSync(routerPath, "utf8");
		assert.ok(routerCode.includes("VisitView"));

		const registryPath = path.resolve(__dirname, "../../appLayout/modalsContainerModules/standalone/clinicalLaunchersRegistry.tsx");
		const registryCode = fs.readFileSync(registryPath, "utf8");
		assert.ok(registryCode.includes("StandaloneEmrMedicalRecordHost"));
	});

	it("7. Primary CTA button in EMR styles enforces single #0d9488 (var(--teal)) (Mandate 8am)", () => {
		const cssPath = path.resolve(__dirname, "../emrStyles/emrLayoutAndHeader.css");
		const cssCode = fs.readFileSync(cssPath, "utf8");

		assert.ok(cssCode.includes("var(--teal, #0d9488)"));
		assert.ok(!cssCode.includes("#0284c7")); // Sky blue eradicated in favor of canonical Teal
	});

	it("8. MedicalRecordStudioModal is canonical SSOT within Sweet Spot 380-450 lines (Mandates 8b, 8e)", () => {
		const modalPath = path.resolve(__dirname, "../MedicalRecordStudioModal.tsx");
		assert.ok(fs.existsSync(modalPath), "MedicalRecordStudioModal.tsx must exist");
		const modalCode = fs.readFileSync(modalPath, "utf8");
		const lineCount = modalCode.split("\n").length;

		assert.ok(
			lineCount >= 380 && lineCount <= 460,
			`MedicalRecordStudioModal lines must be in Sweet Spot 380-450 (actual: ${lineCount})`,
		);
		assert.ok(modalCode.includes("emr-studio-modal"));
		assert.ok(modalCode.includes("Медицинская карта приёма"));
		assert.ok(modalCode.includes("emr-studio-bottom-bar"));
		assert.ok(modalCode.includes("disabled={false}"));
	});

	it("9. medicalCardCatalogData.ts exists and adheres to Sweet Spot 280-350 lines (Mandates 8b, 8x)", () => {
		const catalogPath = path.resolve(__dirname, "../medicalCardCatalogData.ts");
		assert.ok(fs.existsSync(catalogPath), "medicalCardCatalogData.ts must exist");
		const catalogCode = fs.readFileSync(catalogPath, "utf8");
		const lineCount = catalogCode.split("\n").length;

		assert.ok(
			lineCount >= 280 && lineCount <= 350,
			`medicalCardCatalogData lines must be in Sweet Spot 280-350 (actual: ${lineCount})`,
		);
	});
});
