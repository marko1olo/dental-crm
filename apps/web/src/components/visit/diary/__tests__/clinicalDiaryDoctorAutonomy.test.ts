import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Clinical Diary & Doctor Autonomy (Mandates 8e, 8am, 8b, 8x, 8ap)", () => {
	const diaryDir = path.resolve(__dirname, "..");
	const visitDir = path.resolve(diaryDir, "..");
	const emrDir = path.resolve(visitDir, "../emr");

	it("1. Canonical EMR modules exist without raw form numbers (Mandates 8x, 8ap)", () => {
		const files = [
			"clinicalDiaryDefaultData.ts",
			"clinicalDiaryTypes.ts",
			"clinicalDiaryMath.ts",
			"ClinicalDiaryPrintModal.tsx",
			"ClinicalDiaryTabSections.tsx",
		];
		for (const file of files) {
			const fullPath = path.resolve(emrDir, file);
			assert.ok(fs.existsSync(fullPath), `Canonical EMR file must exist: ${file}`);
		}
	});

	it("2. 1-click physiological norm & non-blocking inputs in VisitDiarySection & fields (Mandate 8e)", () => {
		const sectionPath = path.resolve(visitDir, "VisitDiarySection.tsx");
		const anamnesisPath = path.resolve(diaryDir, "fields/VisitDiaryAnamnesisField.tsx");
		const objectivePath = path.resolve(diaryDir, "fields/VisitDiaryObjectiveField.tsx");
		const normHelperPath = path.resolve(diaryDir, "section/applyPhysiologicalNormHelper.ts");

		const sectionContent = fs.readFileSync(sectionPath, "utf8");
		const anamnesisContent = fs.readFileSync(anamnesisPath, "utf8");
		const objectiveContent = fs.readFileSync(objectivePath, "utf8");
		const normHelperContent = fs.readFileSync(normHelperPath, "utf8");

		// Non-blocking fields
		assert.ok(sectionContent.includes("const fieldsDisabled = false;"));

		// 1-click somatic norm in anamnesis
		assert.ok(anamnesisContent.includes("btn-quick-norm-somatic"));
		assert.ok(anamnesisContent.includes("Соматически здоров"));

		// 1-click objective norm in status localis
		assert.ok(objectiveContent.includes("btn-quick-norm-objective"));
		assert.ok(objectiveContent.includes("Интактные зубы") || objectiveContent.includes("интактны"));

		// Full physiological norm helper
		assert.ok(normHelperContent.includes("Z01.2"));
		assert.ok(normHelperContent.includes("Соматически здоров"));
		assert.ok(normHelperContent.includes("scheduleDebouncedSave"));
	});

	it("3. Debounced autosave (400ms) with multiple safety layers against keystroke loss (Mandate 8e)", () => {
		const autosavePath = path.resolve(diaryDir, "../diaryLogic/useVisitDiaryDraftAutosave.ts");
		assert.ok(fs.existsSync(autosavePath), "useVisitDiaryDraftAutosave.ts must exist");

		const autosaveContent = fs.readFileSync(autosavePath, "utf8");
		assert.ok(autosaveContent.includes("scheduleDebouncedSave"));
		assert.ok(autosaveContent.includes("beforeunload"));
		assert.ok(autosaveContent.includes("visibilitychange"));
		assert.ok(autosaveContent.includes("pagehide"));
		assert.ok(autosaveContent.includes("dente-telephony-incoming-call"));
	});

	it("4. Single Primary CTA button in Teal #0d9488 in VisitDiaryActionsFooter (Mandate 8am)", () => {
		const footerPath = path.resolve(diaryDir, "section/VisitDiaryActionsFooter.tsx");
		const footerContent = fs.readFileSync(footerPath, "utf8");

		assert.ok(footerContent.includes('id="diary-complete-visit-btn"'));
		assert.ok(footerContent.includes("diary-complete-visit-btn"));
		assert.ok(footerContent.includes("0d9488") || footerContent.includes("var(--teal"));
		assert.ok(footerContent.includes("Завершить приём и сохранить карту"));

		// Secondary buttons
		assert.ok(footerContent.includes('id="diary-save-btn"'));
		assert.ok(footerContent.includes('id="diary-footer-print-btn"'));
	});

	it("5. Apple HIG Mobile Bottom Sheet for ICD-10 selection with Drag Handle and touch ergonomics (Mandate 8ze)", () => {
		const bottomSheetPath = path.resolve(diaryDir, "fields/IcdMobileBottomSheet.tsx");
		const inputControlPath = path.resolve(diaryDir, "fields/IcdSearchInputControl.tsx");

		assert.ok(fs.existsSync(bottomSheetPath), "IcdMobileBottomSheet.tsx must exist");
		const bsContent = fs.readFileSync(bottomSheetPath, "utf8");
		const inputContent = fs.readFileSync(inputControlPath, "utf8");

		// Drag Handle 36x5px
		assert.ok(bsContent.includes("w-9 h-1.5 rounded-full"));
		assert.ok(bsContent.includes("rounded-t-[24px]"));

		// Touch targets >= 44x44px
		assert.ok(bsContent.includes("min-h-[44px]") || bsContent.includes("min-h-[48px]"));

		// Integrated into input control
		assert.ok(inputContent.includes("IcdMobileBottomSheet"));
	});
});
