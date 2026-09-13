/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 117 — PURIFICATION OF SYNTHETIC NAMES IN RADIOLOGY, TREATMENT PLANS,
 * EGISZ, AND SANPIN (Mandates 8a-8q, THE HAMMER)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Wave 117: Eradication of Synthetic Mocks in Radiology, Treatment Plans, Egisz & SanPin", () => {
	it("verifies absence of 'Смирнова Екатерина Васильевна' and 'Смирнов Алексей Петрович' in DirectRvgCaptureModal.tsx and HotFolderIntakeModal.tsx", () => {
		const directRvgPath = path.join(webSrcRoot, "components/radiology/DirectRvgCaptureModal.tsx");
		const hotFolderPath = path.join(webSrcRoot, "components/radiology/HotFolderIntakeModal.tsx");

		const directRvgContent = fs.readFileSync(directRvgPath, "utf8");
		const hotFolderContent = fs.readFileSync(hotFolderPath, "utf8");

		assert.strictEqual(
			directRvgContent.includes("Смирнова Екатерина Васильевна"),
			false,
			"DirectRvgCaptureModal.tsx must not contain 'Смирнова Екатерина Васильевна'",
		);
		assert.strictEqual(
			directRvgContent.includes("Смирнов Алексей Петрович"),
			false,
			"DirectRvgCaptureModal.tsx must not contain 'Смирнов Алексей Петрович'",
		);

		assert.strictEqual(
			hotFolderContent.includes("Смирнова Екатерина Васильевна"),
			false,
			"HotFolderIntakeModal.tsx must not contain 'Смирнова Екатерина Васильевна'",
		);
		assert.strictEqual(
			hotFolderContent.includes("Смирнов Алексей Петрович"),
			false,
			"HotFolderIntakeModal.tsx must not contain 'Смирнов Алексей Петрович'",
		);
	});

	it("verifies absence of 'Смирнова Е. В.' in RadiologyViewerModal.tsx", () => {
		const viewerPath = path.join(webSrcRoot, "components/radiology/RadiologyViewerModal.tsx");
		const viewerContent = fs.readFileSync(viewerPath, "utf8");

		assert.strictEqual(
			viewerContent.includes("Смирнова Е. В."),
			false,
			"RadiologyViewerModal.tsx must not contain 'Смирнова Е. В.'",
		);
	});

	it("verifies absence of 'Иванов И.И.' in ImplantCrossSectionPlanner.tsx", () => {
		const implantPath = path.join(webSrcRoot, "components/radiology/ImplantCrossSectionPlanner.tsx");
		const implantContent = fs.readFileSync(implantPath, "utf8");

		assert.strictEqual(
			implantContent.includes("Иванов И.И."),
			false,
			"ImplantCrossSectionPlanner.tsx must not contain 'Иванов И.И.'",
		);
	});

	it("verifies absence of 'Смирнов Алексей Петрович' in TreatmentPlanPresenterModal.tsx", () => {
		const presenterPath = path.join(webSrcRoot, "components/treatment-plans/TreatmentPlanPresenterModal.tsx");
		const presenterContent = fs.readFileSync(presenterPath, "utf8");

		assert.strictEqual(
			presenterContent.includes("Смирнов Алексей Петрович"),
			false,
			"TreatmentPlanPresenterModal.tsx must not contain 'Смирнов Алексей Петрович'",
		);
		assert.strictEqual(
			presenterContent.includes("Смирнова Екатерина Васильевна"),
			false,
			"TreatmentPlanPresenterModal.tsx must not contain 'Смирнова Екатерина Васильевна'",
		);
	});

	it("verifies absence of 'Кузнецов М.С.' in MedicalWasteJournalModal.tsx", () => {
		const wastePath = path.join(webSrcRoot, "components/sanpin/waste/MedicalWasteJournalModal.tsx");
		const wasteContent = fs.readFileSync(wastePath, "utf8");

		assert.strictEqual(
			wasteContent.includes("Кузнецов М.С."),
			false,
			"MedicalWasteJournalModal.tsx must not contain 'Кузнецов М.С.'",
		);
	});

	it("verifies absence of 'Др. Смирнов А.В.' in RadiologyReferralModal, RadiologyModule, and RadiationDoseSheet", () => {
		const referralPath = path.join(webSrcRoot, "components/radiology/RadiologyReferralModal.tsx");
		const radiologyModulePath = path.join(webSrcRoot, "components/radiology/RadiologyModule.tsx");
		const doseModalPath = path.join(webSrcRoot, "components/radiology/doseSheet/RadiationDoseSheetModal.tsx");
		const doseEnginePath = path.join(webSrcRoot, "components/radiology/doseSheet/radiationDoseEngine.ts");

		const referralContent = fs.readFileSync(referralPath, "utf8");
		const moduleContent = fs.readFileSync(radiologyModulePath, "utf8");
		const doseModalContent = fs.readFileSync(doseModalPath, "utf8");
		const doseEngineContent = fs.readFileSync(doseEnginePath, "utf8");

		assert.strictEqual(
			referralContent.includes("Др. Смирнов А.В."),
			false,
			"RadiologyReferralModal.tsx must not contain 'Др. Смирнов А.В.'",
		);
		assert.strictEqual(
			moduleContent.includes("Др. Смирнов А.В."),
			false,
			"RadiologyModule.tsx must not contain 'Др. Смирнов А.В.'",
		);
		assert.strictEqual(
			doseModalContent.includes("Др. Смирнов А.В."),
			false,
			"RadiationDoseSheetModal.tsx must not contain 'Др. Смирнов А.В.'",
		);
		assert.strictEqual(
			doseEngineContent.includes("Др. Смирнов А.В."),
			false,
			"radiationDoseEngine.ts must not contain 'Др. Смирнов А.В.'",
		);
	});

	it("verifies absence of 'Д-р Смирнов А. В.' in TreatmentPlanModule.tsx", () => {
		const planModulePath = path.join(webSrcRoot, "components/treatment-plans/TreatmentPlanModule.tsx");
		const planModuleContent = fs.readFileSync(planModulePath, "utf8");

		assert.strictEqual(
			planModuleContent.includes("Д-р Смирнов А. В."),
			false,
			"TreatmentPlanModule.tsx must not contain 'Д-р Смирнов А. В.'",
		);
	});

	it("verifies absence of hardcoded Elena Smirnova in egisz/EgiszCdaExportModal.tsx", () => {
		const egiszPath = path.join(webSrcRoot, "components/egisz/EgiszCdaExportModal.tsx");
		if (!fs.existsSync(egiszPath)) {
			return; // Facade liquidated per Mandate 8s
		}
		const egiszContent = fs.readFileSync(egiszPath, "utf8");

		assert.strictEqual(
			egiszContent.includes("Смирнова"),
			false,
			"EgiszCdaExportModal.tsx must not contain hardcoded 'Смирнова'",
		);
	});

	it("verifies absence of hardcoded doctor names in retroactiveSanpinEngine.ts", () => {
		const sanpinEnginePath = path.join(webSrcRoot, "components/sanpin/retroactiveSanpinEngine.ts");
		const sanpinEngineContent = fs.readFileSync(sanpinEnginePath, "utf8");

		assert.strictEqual(
			sanpinEngineContent.includes("Д-р Иванов А.С."),
			false,
			"retroactiveSanpinEngine.ts must not contain 'Д-р Иванов А.С.'",
		);
		assert.strictEqual(
			sanpinEngineContent.includes("Д-р Смирнов В.П."),
			false,
			"retroactiveSanpinEngine.ts must not contain 'Д-р Смирнов В.П.'",
		);
		assert.strictEqual(
			sanpinEngineContent.includes("Д-р Кузнецова Е.Н."),
			false,
			"retroactiveSanpinEngine.ts must not contain 'Д-р Кузнецова Е.Н.'",
		);
	});
});
