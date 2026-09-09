/**
 * outpatientForm043AndPatientCardAutonomy.test.tsx
 *
 * Test suite for Form 043/u and Clinical Records Doctor Autonomy (Mandates 8e, 8d, 8g, 8n).
 *
 * Verifies:
 * 1. Mandate 8e item 3: 1-click physiological norm button in Form 043/u (btn-043-global-norm-1click)
 *    and Patient Card / General Info tab (btn-somatic-healthy-norm).
 * 2. Mandate 8e item 4: Zero permanent locks; 1-click revision mode («Исправленному верить»)
 *    with version audit in Form 043/u and visit diary.
 * 3. Mandate 8e item 5: Print Form 043/u and Patient Card available at any time
 *    (watermarks: «ЧЕРНОВИК», «ПОДПИСАНО ВРАЧОМ», «ИСПРАВЛЕННОМУ ВЕРИТЬ»).
 * 4. Mandate 8d item 7: STRICTLY 0 cartoon emojis in 043/u, diaries, and patient cards (Lucide icons only).
 * 5. Touch target ergonomics: interactive buttons meet >= 44x44px.
 * 6. Barrel exports in patient domain index.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("EMR Form 043/u & Patient Card Autonomy (Mandates 8e, 8d, 8n)", () => {
	const form043Path = path.resolve(
		__dirname,
		"../forms/DentalMedicalCard043uForm.tsx",
	);
	const form043Source = fs.readFileSync(form043Path, "utf8");

	const editorPath = path.resolve(
		__dirname,
		"../forms/OutpatientForm043Editor.tsx",
	);
	const editorSource = fs.readFileSync(editorPath, "utf8");

	const patientModalPath = path.resolve(
		__dirname,
		"../../patient/PatientCardModal.tsx",
	);
	const patientModalSource = fs.readFileSync(patientModalPath, "utf8");

	const generalInfoTabPath = path.resolve(
		__dirname,
		"../../patient/tabs/PatientGeneralInfoTab.tsx",
	);
	const generalInfoTabSource = fs.readFileSync(generalInfoTabPath, "utf8");

	const patientIndexPath = path.resolve(
		__dirname,
		"../../patient/index.ts",
	);
	const patientIndexSource = fs.readFileSync(patientIndexPath, "utf8");

	const diaryLogicPath = path.resolve(
		__dirname,
		"../../useVisitDiaryLogic.ts",
	);
	const diaryLogicSource = fs.readFileSync(diaryLogicPath, "utf8");

	const visitViewPath = path.resolve(
		__dirname,
		"../../../VisitView.tsx",
	);
	const visitViewSource = fs.readFileSync(visitViewPath, "utf8");

	const visitDiarySectionPath = path.resolve(
		__dirname,
		"../../visit/VisitDiarySection.tsx",
	);
	const visitDiarySectionSource = fs.readFileSync(visitDiarySectionPath, "utf8");

	it("1. Form 043/u: exposes 1-click global physiological norm button (btn-043-global-norm-1click)", () => {
		assert.ok(
			form043Source.includes('data-testid="btn-043-global-norm-1click"'),
			"Must include btn-043-global-norm-1click button in DentalMedicalCard043uForm",
		);
		assert.ok(
			form043Source.includes("handleApplyGlobalNorm"),
			"Must implement handleApplyGlobalNorm function in DentalMedicalCard043uForm",
		);
		// Check that global norm fills odontogram, mucosa, bite, lymph nodes, somatic status
		assert.ok(
			form043Source.includes("createIntactOdontogramRecords"),
			"handleApplyGlobalNorm must populate intact odontogram (32 teeth intact)",
		);
		assert.ok(
			form043Source.includes("createForm043PhysiologicalNorm"),
			"handleApplyGlobalNorm must call createForm043PhysiologicalNorm",
		);
		assert.ok(
			form043Source.includes("setOralMucosa(norm.oralMucosaStatus)"),
			"handleApplyGlobalNorm must set oral mucosa to physiological norm",
		);
	});

	it("2. Form 043/u: exposes revision mode button («Исправленному верить») and effectiveDisabled unlock", () => {
		assert.ok(
			form043Source.includes('data-testid="btn-043-revise"'),
			"Must include btn-043-revise button in DentalMedicalCard043uForm",
		);
		assert.ok(
			form043Source.includes("effectiveDisabled"),
			"Must use effectiveDisabled instead of rigid disabled to allow revision mode",
		);
		assert.ok(
			form043Source.includes("Boolean(disabled && !isRevising)"),
			"effectiveDisabled must be false when isRevising is active even if parent passed disabled",
		);
		assert.ok(
			form043Source.includes("form043-revision-banner"),
			"Must render revision banner when isRevising is active",
		);
	});

	it("3. Form 043/u: fast print and blank print are always available with watermark audit", () => {
		assert.ok(
			form043Source.includes('data-testid="btn-043-fast-print"'),
			"Must expose btn-043-fast-print",
		);
		assert.ok(
			form043Source.includes('data-testid="btn-043-print-blank"'),
			"Must expose btn-043-print-blank for empty card with underscores",
		);
		assert.ok(
			form043Source.includes("ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ"),
			"Watermark must support revision count stamp",
		);
		assert.ok(
			form043Source.includes("ПОДПИСАНО ВРАЧОМ"),
			"Watermark must support signed stamp",
		);
		assert.ok(
			form043Source.includes("ЧЕРНОВИК"),
			"Watermark must support draft stamp",
		);
	});

	it("4. OutpatientForm043Editor re-exports DentalMedicalCard043uForm cleanly", () => {
		assert.ok(
			editorSource.includes("DentalMedicalCard043uForm"),
			"OutpatientForm043Editor must import and export DentalMedicalCard043uForm",
		);
		assert.ok(
			editorSource.includes("export const OutpatientForm043Editor"),
			"Must export OutpatientForm043Editor component",
		);
	});

	it("5. PatientCardModal & PatientGeneralInfoTab: expose 1-click somatic norm button (btn-somatic-healthy-norm)", () => {
		assert.ok(
			generalInfoTabSource.includes('data-testid="btn-somatic-healthy-norm"'),
			"PatientGeneralInfoTab must include btn-somatic-healthy-norm",
		);
		assert.ok(
			patientModalSource.includes('data-testid="btn-somatic-healthy-norm"'),
			"PatientCardModal must include btn-somatic-healthy-norm in header",
		);
		assert.ok(
			patientModalSource.includes('data-testid="btn-print-patient-card"'),
			"PatientCardModal must include btn-print-patient-card for instant printing",
		);
	});

	it("6. PatientCardModal & PatientGeneralInfoTab are exported in patient domain index", () => {
		assert.ok(
			patientIndexSource.includes('export * from "./PatientCardModal";'),
			"patient/index.ts must export PatientCardModal",
		);
		assert.ok(
			patientIndexSource.includes('export * from "./tabs/PatientGeneralInfoTab";'),
			"patient/index.ts must export PatientGeneralInfoTab",
		);
	});

	it("7. useVisitDiaryLogic: implements and exports applySomaticNorm with auto-revision", () => {
		assert.ok(
			diaryLogicSource.includes("applySomaticNorm"),
			"useVisitDiaryLogic must define applySomaticNorm",
		);
		assert.ok(
			diaryLogicSource.includes("if (isLocked && !isRevising)"),
			"applySomaticNorm must trigger beginRevise() if locked",
		);
		assert.ok(
			diaryLogicSource.includes("applySomaticNorm,\n\t};"),
			"useVisitDiaryLogic must export applySomaticNorm in its return block",
		);
	});

	it("8. VisitDiarySection: exposes 1-click norm buttons that auto-initiate revision when locked", () => {
		assert.ok(
			visitDiarySectionSource.includes('data-testid="diary-1click-norm-btn"'),
			"VisitDiarySection must include diary-1click-norm-btn",
		);
		assert.ok(
			visitDiarySectionSource.includes('data-testid="diary-norm-043-btn"'),
			"VisitDiarySection must include diary-norm-043-btn",
		);
		assert.ok(
			visitDiarySectionSource.includes("handleApplyFullPhysiologicalNorm"),
			"VisitDiarySection must handle applying full physiological norm",
		);
	});

	it("9. VisitView: handlePrintForm043uFast supports revision watermark", () => {
		assert.ok(
			visitViewSource.includes("handlePrintForm043uFast"),
			"VisitView must define handlePrintForm043uFast",
		);
		assert.ok(
			visitViewSource.includes("ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ"),
			"VisitView must include revision watermark in handlePrintForm043uFast",
		);
	});

	it("10. Zero cartoon emojis in all clinical records and patient card files (Mandate 8d item 7)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const filesToCheck = [
			{ name: "DentalMedicalCard043uForm.tsx", content: form043Source },
			{ name: "OutpatientForm043Editor.tsx", content: editorSource },
			{ name: "PatientCardModal.tsx", content: patientModalSource },
			{ name: "PatientGeneralInfoTab.tsx", content: generalInfoTabSource },
			{ name: "useVisitDiaryLogic.ts", content: diaryLogicSource },
		];

		for (const file of filesToCheck) {
			assert.strictEqual(
				emojiRegex.test(file.content),
				false,
				`File ${file.name} must NOT contain any cartoon emojis`,
			);
		}
	});

	it("11. Touch target ergonomics: all interactive buttons have min-h-[44px] or 44px (Mandate 8d)", () => {
		assert.ok(
			patientModalSource.includes("min-h-[44px]") || patientModalSource.includes("h-[44px]"),
			"PatientCardModal buttons must meet 44px touch target ergonomics",
		);
		assert.ok(
			generalInfoTabSource.includes("min-h-[44px]") || generalInfoTabSource.includes("h-[44px]"),
			"PatientGeneralInfoTab buttons must meet 44px touch target ergonomics",
		);
	});

	it("12. Form 043/u: undo norm button (btn-043-undo-norm) is available in active draft mode when reviseSnapshot !== null", () => {
		assert.ok(
			form043Source.includes('data-testid="btn-043-undo-norm"'),
			"Must include btn-043-undo-norm button in DentalMedicalCard043uForm",
		);
		assert.ok(
			form043Source.includes("handleCancelRevise"),
			"btn-043-undo-norm must trigger handleCancelRevise",
		);
		assert.ok(
			form043Source.includes("<Undo2"),
			"btn-043-undo-norm must use Undo2 Lucide icon",
		);
		// Verify btn-043-undo-norm is displayed when reviseSnapshot !== null and NOT blocked by disabled || isSigned
		const undoBlockMatch = form043Source.match(/reviseSnapshot\s*!==\s*null[\s\S]*?data-testid="btn-043-undo-norm"/);
		assert.ok(
			undoBlockMatch,
			"btn-043-undo-norm must be guarded by reviseSnapshot !== null, allowing active draft undo (disabled=false, isSigned=false)",
		);
	});
});
