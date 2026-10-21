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

	it("2. DoctorPayrollModal & state eradicate hardcoded 'ООО «Денте Стоматология»' and synthetic figures", () => {
		const modalPath = path.resolve(webSrcDir, "components/payroll/DoctorPayrollModal.tsx");
		const modalContent = fs.readFileSync(modalPath, "utf-8");

		// Must not have hardcoded default
		assert.ok(!modalContent.includes('clinicName = "ООО «Денте Стоматология»"'), "Must eradicate default ООО «Денте Стоматология»");
		assert.ok(modalContent.includes("useDocumentBrandingStore"), "Must resolve clinic name dynamically");

		const contentPath = path.resolve(webSrcDir, "components/payroll/DoctorPayrollModalContent.tsx");
		const contentCode = fs.readFileSync(contentPath, "utf-8");
		assert.ok(contentCode.includes("Выберите врача для формирования расчетного листа"), "Must render honest EmptyState when no doctor is chosen");

		const statePath = path.resolve(webSrcDir, "components/payroll/useDoctorPayrollModalState.ts");
		const stateCode = fs.readFileSync(statePath, "utf-8");
		assert.ok(stateCode.includes('doctorName: "Врач не выбран"'), "State must cleanly report Врач не выбран when activeDoc is null");
		assert.ok(stateCode.includes("totalGrossRevenueKop: 0"), "Revenue must be 0 kop when activeDoc is null");
	});

	it("3. HeaderGlobalSearch.tsx eradicates SAMPLE_PATIENTS and queries live API", () => {
		const filePath = path.resolve(webSrcDir, "components/headerModules/HeaderGlobalSearch.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("SAMPLE_PATIENTS"), "Must completely eradicate SAMPLE_PATIENTS");
		assert.ok(!content.includes("Иванов Иван Иванович"), "Must not hardcode dummy patient Иванов");
		assert.ok(!content.includes("Смирнова Анна Сергеевна"), "Must not hardcode dummy patient Смирнова");
		assert.ok(!content.includes("Кузнецов Дмитрий Павлович"), "Must not hardcode dummy patient Кузнецов");
		assert.ok(content.includes("/api/patients?search="), "Must query live /api/patients endpoint with search parameter");
		assert.ok(content.includes("Пациенты не найдены по запросу"), "Must render honest empty search message");
	});

	it("4. TreatmentPlanPriceValidatorModal eliminates [21] tooth fallback and validates required fields", () => {
		const filePath = path.resolve(webSrcDir, "components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx");
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

	it("6. MobileChairsideEHR.tsx initializes with clean empty strings for diagnosis and plan", () => {
		const filePath = path.resolve(webSrcDir, "components/mobile/MobileChairsideEHR.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes('useState<string>("К02.1 Кариес дентина")'), "Must not initialize diagnosis with hardcoded caries");
		assert.ok(!content.includes('useState<string>(\n    "Препарирование, медикаментозная обработка'), "Must not initialize treatment plan with hardcoded procedure");
		assert.ok(content.includes("initialDiagnosis = \"\""), "Must default initialDiagnosis to empty string");
		assert.ok(content.includes("initialTreatmentPlan = \"\""), "Must default initialTreatmentPlan to empty string");
	});
});
