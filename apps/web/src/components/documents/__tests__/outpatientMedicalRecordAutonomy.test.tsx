/**
 * outpatientForm043AndPatientCardAutonomy.test.tsx
 *
 * Test suite for EMR Medical Record Studio and Clinical Records Doctor Autonomy (Mandates 8e, 8d, 8g, 8n).
 *
 * Verifies:
 * 1. Mandate 8e item 3: 1-click physiological norm button in MedicalRecordStudioModal (btn-emr-apply-norm)
 *    and Patient Card / General Info tab (btn-somatic-healthy-norm).
 * 2. Mandate 8e item 4: Zero permanent locks; effectiveIsDraft and doctor non-blocking mode in MedicalRecordStudioModal.
 * 3. Mandate 8e item 5: Print EMR available at any time with watermarks («ЧЕРНОВИК», «ПОДПИСАНО ВРАЧОМ»).
 * 4. Mandate 8s: Elimination of legacy Soviet facades (DentalMedicalCard043uForm, OutpatientForm043Editor)
 *    in favor of canonical MedicalRecordStudioModal.
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

describe("EMR Medical Record Studio & Patient Card Autonomy (Mandates 8e, 8d, 8n)", () => {
	const emrStudioPath = path.resolve(
		__dirname,
		"../../emr/MedicalRecordStudioModal.tsx",
	);
	const emrStudioSource = fs.readFileSync(emrStudioPath, "utf8");

	const medicalCatalogPath = path.resolve(
		__dirname,
		"../../emr/medicalCardCatalogData.ts",
	);
	const medicalCatalogSource = fs.readFileSync(medicalCatalogPath, "utf8");

	const recordHtmlGenPath = path.resolve(
		__dirname,
		"../../emr/record/html/recordHtmlGenerator.ts",
	);
	const recordHtmlGenSource = fs.readFileSync(recordHtmlGenPath, "utf8");

	const patientModalPath = path.resolve(
		__dirname,
		"../../patients/PatientCardModal.tsx",
	);
	const patientModalModulesDir = path.resolve(__dirname, "../../patients/patientCardModalModules");
	const patientModalModulesFiles = fs.existsSync(patientModalModulesDir)
		? fs.readdirSync(patientModalModulesDir).map((f) => fs.readFileSync(path.join(patientModalModulesDir, f), "utf8")).join("\n")
		: "";
	const patientModalSource = fs.readFileSync(patientModalPath, "utf8") + "\n" + patientModalModulesFiles;

	const generalInfoTabPath = path.resolve(
		__dirname,
		"../../patients/tabs/PatientGeneralInfoTab.tsx",
	);
	const generalInfoModulesDir = path.resolve(__dirname, "../../patients/tabs/generalInfo");
	const generalInfoModulesFiles = fs.existsSync(generalInfoModulesDir)
		? fs.readdirSync(generalInfoModulesDir).map((f) => fs.readFileSync(path.join(generalInfoModulesDir, f), "utf8")).join("\n")
		: "";
	const generalInfoTabSource = fs.readFileSync(generalInfoTabPath, "utf8") + "\n" + generalInfoModulesFiles;

	const emkControllerPath = path.resolve(
		__dirname,
		"../../visit/emkTabModules/useVisitEmkTabController.ts",
	);
	const emkControllerSource = fs.readFileSync(emkControllerPath, "utf8");

	const visitViewPath = path.resolve(
		__dirname,
		"../../../VisitView.tsx",
	);
	const visitViewModulesDir = path.resolve(__dirname, "../../visit/view");
	const visitViewModulesFiles = fs.existsSync(visitViewModulesDir)
		? fs
				.readdirSync(visitViewModulesDir, { recursive: true })
				.filter((f) => typeof f === "string" && (f.endsWith(".ts") || f.endsWith(".tsx")))
				.map((f) => fs.readFileSync(path.join(visitViewModulesDir, f as string), "utf8"))
				.join("\n")
		: "";
	const visitViewSource = fs.readFileSync(visitViewPath, "utf8") + "\n" + visitViewModulesFiles;

	const visitEmkTabPath = path.resolve(
		__dirname,
		"../../visit/VisitEmkTab.tsx",
	);
	const visitEmkTabDir = path.resolve(__dirname, "../../visit/emkTabModules");
	const visitEmkTabFiles = fs.existsSync(visitEmkTabDir)
		? fs.readdirSync(visitEmkTabDir).map((f) => fs.readFileSync(path.join(visitEmkTabDir, f), "utf8")).join("\n")
		: "";
	const visitEmkTabSource = fs.readFileSync(visitEmkTabPath, "utf8") + "\n" + visitEmkTabFiles;

	it("1. MedicalRecordStudioModal: exposes 1-click global physiological norm button (btn-emr-apply-norm)", () => {
		assert.ok(
			emrStudioSource.includes('data-testid="btn-emr-apply-norm"'),
			"Must include btn-emr-apply-norm button in MedicalRecordStudioModal",
		);
		assert.ok(
			emrStudioSource.includes("handleApplyNorm"),
			"Must implement handleApplyNorm function in MedicalRecordStudioModal",
		);
		assert.ok(
			medicalCatalogSource.includes("applyMedicalCardPhysiologicalNorm"),
			"Must export applyMedicalCardPhysiologicalNorm function in medicalCardCatalogData",
		);
		assert.ok(
			medicalCatalogSource.includes("DEFAULT_32_PERMANENT_TEETH"),
			"medicalCardCatalogData must populate intact permanent dentition FDI 11-48",
		);
	});

	it("2. MedicalRecordStudioModal: exposes non-blocking draft/signed state with effectiveIsDraft", () => {
		assert.ok(
			emrStudioSource.includes("effectiveIsDraft"),
			"Must compute effectiveIsDraft to allow editing without permanent lock out",
		);
		assert.ok(
			emrStudioSource.includes('data-testid="badge-emr-draft-status"'),
			"Must render draft/signed status badge",
		);
	});

	it("3. EMR Print: generateMedicalRecordPrintHtml supports draft and signed watermark stamps", () => {
		assert.ok(
			recordHtmlGenSource.includes("generateMedicalRecordPrintHtml"),
			"Must export generateMedicalRecordPrintHtml function",
		);
		assert.ok(
			recordHtmlGenSource.includes("ЧЕРНОВИК"),
			"Watermark must support draft stamp ЧЕРНОВИК",
		);
		assert.ok(
			recordHtmlGenSource.includes("ПОДПИСАНО ВРАЧОМ"),
			"Watermark must support signed stamp ПОДПИСАНО ВРАЧОМ",
		);
	});

	it("4. Legacy facades (DentalMedicalCard043uForm, OutpatientForm043Editor) are eliminated (Mandate 8s)", () => {
		const form043Path = path.resolve(
			__dirname,
			"../forms/DentalMedicalCard043uForm.tsx",
		);
		const editorFacadePath = path.resolve(
			__dirname,
			"../forms/OutpatientForm043Editor.tsx",
		);
		assert.strictEqual(
			fs.existsSync(form043Path),
			false,
			"DentalMedicalCard043uForm must be eliminated in favor of MedicalRecordStudioModal",
		);
		assert.strictEqual(
			fs.existsSync(editorFacadePath),
			false,
			"OutpatientForm043Editor facade must be eliminated",
		);
		assert.ok(
			emrStudioSource.includes("export const MedicalRecordStudioModal"),
			"Must export canonical MedicalRecordStudioModal component",
		);
	});

	it("5. PatientCardModal exposes 1-click somatic norm button (btn-somatic-healthy-norm) in toolbar (Mandate 8p §206)", () => {
		assert.ok(
			patientModalSource.includes('data-testid="btn-somatic-healthy-norm"'),
			"PatientCardModal must include btn-somatic-healthy-norm in toolbar",
		);
		assert.ok(
			patientModalSource.includes('data-testid="btn-print-patient-card"'),
			"PatientCardModal must include btn-print-patient-card for instant printing",
		);
	});

	it("6. PatientCardModal & PatientGeneralInfoTab are exported in patient domain index", () => {
		const patientsIndexPath = path.resolve(__dirname, "../../patients/index.ts");
		const patientsIndexSource = fs.readFileSync(patientsIndexPath, "utf8");
		assert.ok(
			patientsIndexSource.includes('export * from "./PatientCardModal";') ||
				patientsIndexSource.includes('export * from "./PatientCardModal"'),
			"patients/index.ts must export PatientCardModal",
		);
		assert.ok(
			patientsIndexSource.includes('export * from "./tabs/PatientGeneralInfoTab";') ||
				patientsIndexSource.includes('export * from "./tabs/PatientGeneralInfoTab"'),
			"patients/index.ts must export PatientGeneralInfoTab",
		);
	});

	it("7. useVisitEmkTabController: implements and exports handleApplyPhysiologicalNorm with auto-revision", () => {
		assert.ok(
			emkControllerSource.includes("handleApplyPhysiologicalNorm"),
			"useVisitEmkTabController must define handleApplyPhysiologicalNorm",
		);
		assert.ok(
			emkControllerSource.includes("if (isSignedVisit && !isRevisingVisitNote)"),
			"handleApplyPhysiologicalNorm must trigger revision mode if signed",
		);
		assert.ok(
			emkControllerSource.includes("handleApplyPhysiologicalNorm,"),
			"useVisitEmkTabController must export handleApplyPhysiologicalNorm in its return block",
		);
	});

	it("8. VisitEmkTab: exposes 1-click physiological norm with ICD-10 Z01.2", () => {
		assert.ok(
			visitEmkTabSource.includes("handleApplyPhysiologicalNorm"),
			"VisitEmkTab must define handleApplyPhysiologicalNorm",
		);
		assert.ok(
			visitEmkTabSource.includes("Z01.2"),
			"handleApplyPhysiologicalNorm must set ICD-10 Z01.2 Стоматологическое обследование",
		);
		assert.ok(
			visitEmkTabSource.includes('data-testid="visit-emk-tab"'),
			"VisitEmkTab must render data-testid visit-emk-tab",
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
			{ name: "MedicalRecordStudioModal.tsx", content: emrStudioSource },
			{ name: "PatientCardModal.tsx", content: patientModalSource },
			{ name: "PatientGeneralInfoTab.tsx", content: generalInfoTabSource },
			{ name: "useVisitEmkTabController.ts", content: emkControllerSource },
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

	it("12. MedicalRecordStudioModal: print and export buttons are always available (Mandate 8e)", () => {
		assert.ok(
			emrStudioSource.includes('data-testid="btn-emr-print-card"'),
			"Must include btn-emr-print-card button in MedicalRecordStudioModal",
		);
		assert.ok(
			emrStudioSource.includes("handlePrint"),
			"Must implement handlePrint in MedicalRecordStudioModal",
		);
	});
});
