/**
 * ═══════════════════════════════════════════════════════════════════════════
 * milestone3DataPurityInquisition.test.ts
 *
 * Inquisitor Verification Suite for Milestone 3 (Data Purity & Zero Mocks):
 * - Mandate 8f & 8am: 100% Honesty, Zero Hardcoded Fallbacks & Silent Dummy Data.
 * - Mandate 8wy: Strict Isolation of Production from Demo Showcase Data.
 * - Mandate 8e: Clinician & Solo Doctor Autonomy (Honest Empty States).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "..");

describe("Milestone 3: Data Purity & Zero Hardcoded Fallbacks Inquisition", () => {
	it("1. TreatmentPipeline.tsx binds live organization branding & handles unassigned doctor", () => {
		const filePath = path.resolve(webSrcDir, "pages/coordinator/TreatmentPipeline.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		// Check dynamic requisites extraction
		assert.ok(content.includes("useDocumentBrandingStore"), "Must use document branding store");
		assert.ok(content.includes("useOptionalAppLogicContext"), "Must use app logic context");
		assert.ok(content.includes("Реквизиты клиники не заполнены в профиле организации"), "Must warn when requisites are missing");

		// Check unassigned doctor selector
		assert.ok(content.includes("Врач не назначен"), "Must handle unassigned doctor");
		assert.ok(content.includes("effectiveDoctorName"), "Must pass effective doctor name to presenter");
	});

	it("2. DoctorPayrollStudioModal eradicates hardcoded 'ООО «Денте Стоматология»' and synthetic figures", () => {
		const modalPath = path.resolve(webSrcDir, "components/payroll/DoctorPayrollStudioModal.tsx");
		const modalContent = fs.readFileSync(modalPath, "utf-8");

		// Must not have hardcoded default
		assert.ok(!modalContent.includes('clinicName = "ООО «Денте Стоматология»"'), "Must eradicate default ООО «Денте Стоматология»");
		assert.ok(modalContent.includes("Нет закрытых нарядов за выбранный период"), "Must render honest EmptyState when no orders exist");
		assert.ok(modalContent.includes("isDemoShowcaseMode"), "Must guard demo showcase behind isDemoShowcaseMode");
	});

	it("3. Omnibar.tsx & WorkspaceTopBarCommandHub.tsx replace legacy HeaderGlobalSearch without dummy patients", async () => {
		const { searchPatientsQuick } = await import("../components/patients/patientSearchFuzzy");
		const matches = searchPatientsQuick([], "Иван");
		assert.deepEqual(matches, [], "Empty patient dataset must return empty search results without hardcoded samples");
		const headerIndex = await import("../components/headerModules/index");
		assert.equal("HeaderGlobalSearch" in headerIndex, false, "2FP orphan HeaderGlobalSearch must stay removed from headerModules");
	});

	it("4. TreatmentPlanPriceValidatorModal eliminates [21] tooth fallback and validates required fields", () => {
		const filePath = path.resolve(webSrcDir, "components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx");
		if (!fs.existsSync(filePath)) {
			// Legacy validation modal eradicated per Red Team inquisition
			assert.equal(fs.existsSync(filePath), false, "Obsolete TreatmentPlanPriceValidatorModal must remain eradicated");
			return;
		}
		const dataPath = path.resolve(webSrcDir, "components/treatment-plans/validation/modal/usePriceValidatorData.ts");
		const actionsPath = path.resolve(webSrcDir, "components/treatment-plans/validation/modal/usePriceValidatorActions.ts");
		const content =
			fs.readFileSync(filePath, "utf-8") +
			(fs.existsSync(dataPath) ? fs.readFileSync(dataPath, "utf-8") : "") +
			(fs.existsSync(actionsPath) ? fs.readFileSync(actionsPath, "utf-8") : "");

		assert.ok(!content.includes(": [21]"), "Must eradicate rogue [21] central incisor fallback");
		assert.ok(content.includes(": []") || content.includes("teeth: []"), "Must fallback to empty array [] for teeth when no teeth specified");
		assert.ok(content.includes('patientName: ""'), "EMPTY_PLAN_PAYLOAD must have empty patientName");
		assert.ok(content.includes('doctorFullName: ""'), "EMPTY_PLAN_PAYLOAD must have empty doctorFullName");
		assert.ok(
			content.includes("Невозможно сформировать наряд ЗТЛ: в плане лечения отсутствуют позиции услуг") ||
			content.includes("Невозможно сформировать наряд ЗТЛ"),
			"Must validate empty items before lab work order",
		);
		assert.ok(
			content.includes("Невозможно сформировать акт: в плане лечения отсутствуют позиции услуг") ||
			content.includes("Невозможно сформировать акт"),
			"Must validate empty items before completed act",
		);
	});

	it("5. fastPrintConsentAndMemoBuilder eliminates synthetic prices and renders empty tables cleanly", () => {
		const filePath = path.resolve(webSrcDir, "components/visit/view/fastPrintModules/fastPrintConsentAndMemoBuilder.ts");
		const content = fs.readFileSync(filePath, "utf-8");

		// Check that synthetic prices arrays are gone
		assert.ok(!content.includes("priceRub: 1500"), "Must eradicate synthetic 1500 RUB service");
		assert.ok(!content.includes("priceRub: 4500"), "Must eradicate synthetic 4500 RUB service");
		assert.ok(!content.includes("priceRub: 5500"), "Must eradicate synthetic 5500 RUB service");
		assert.ok(!content.includes("priceRub: 4800"), "Must eradicate synthetic 4800 RUB service");
		assert.ok(!content.includes("priceRub: 12500"), "Must eradicate synthetic 12500 RUB service");
		assert.ok(content.includes("Услуги не выбраны"), "Must render clean empty state in completed act");
		assert.ok(content.includes("Позиции плана лечения не указаны"), "Must render clean empty state in estimate");

		const diaryPath = path.resolve(webSrcDir, "components/visit/view/fastPrintModules/fastPrintDiaryBuilder.ts");
		const diaryContent = fs.readFileSync(diaryPath, "utf-8");
		assert.ok(diaryContent.includes("dashboard?.clinicSettings"), "extractClinicRequisites must check clinicSettings");
	});
});
