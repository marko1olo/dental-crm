/**
 * apps/web/src/components/visit/__tests__/emkIntakeAndFastPrintDecomposition.test.tsx
 *
 * Comprehensive Test Suite for Visit EMK, Intake Cockpit, and Fast Print Modules Decomposition:
 * 1. Fast Print Builders (Diary Sheet, Patient Memo, Consent, Completed Act, Estimate, DMFT math, zero emojis).
 * 2. EMK Presets & clinicalDiagnosesSsot Integration (1-click norm, ICD-10 outpatient catalog, SOAP protocols).
 * 3. Intake Cockpit Somatic Stop-Factors & Vital Signs (BP, pulse, adrenaline safety assessment, zero emojis).
 * 4. Architectural & Line Limit Invariants (Facades <= 250 lines, all modules <= 500 lines, zero emojis).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
	buildFastPrintDiarySheetHtml,
	normalizeOdontogramForDmft,
	extractClinicRequisites,
} from "../view/fastPrintModules/fastPrintDiaryBuilder";

import {
	buildFastPrintPatientMemoHtml,
} from "../view/fastPrintModules/fastPrintConsentAndMemoBuilder";

import {
	buildEmkHealthyComplaintsAndAnamnesisPreset,
	applySomaticQuickChipToAnamnesis,
} from "../emkTabModules/EmkComplaintsAndAnamnesisSection";

import {
	buildDiagnosisProtocolFromSsot,
	getOutpatientDiagnosesForQuickPicker,
} from "../emkTabModules/EmkDiagnosisAndProtocolSection";

import {
	createDefaultNormalVitalSigns,
	evaluateIntakeAdrenalineContraindication,
} from "../intakeCockpitModules/IntakeVitalSignsBar";

import {
	createDefaultHealthyIntakeSomaticState,
	toggleIntakeSomaticChip,
	toggleIntakeAllergen,
	toggleIntakeStopFactor,
	buildIntakeSomaticSummaryText,
} from "../intakeCockpitModules/IntakeSomaticCheckboxesGrid";

import {
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	CLINICAL_DIAGNOSES_SSOT,
	SOMATIC_QUICK_CHIPS,
} from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("Visit EMK, Intake Cockpit & Fast Print Decomposition Verification", () => {
	describe("1. Fast Print Diary Sheet & Patient Memo Builders", () => {
		it("generates official Form 043/u examination diary sheet with zero cartoon emojis", () => {
			const html = buildFastPrintDiarySheetHtml({
				activePatient: {
					fullName: "Смирнов Алексей Петрович",
					cardNumber: "043-8821",
				},
				activeDoctor: {
					fullName: "Д-р Кузнецова М.В.",
					specialty: "Стоматолог-терапевт",
				},
				visitDate: "2026-10-12",
				visitNoteForm: {
					complaint: "Жалобы на кратковременные боли от холодного в зубе 1.6.",
					anamnesis: "Соматически здоров. Аллергоанамнез не отягощен.",
					objectiveStatus: "Зуб 1.6: глубокая кариозная полость на жевательной поверхности. Зондирование дна чувствительно.",
					diagnosis: "K02.1 Кариес дентина (зуб 1.6)",
					treatmentPlan: "Препарирование, медикаментозная обработка, постановка пломбы Ceram.x Spectra.",
					recommendations: "Гигиена полости рта, щадящая диета 24 ч.",
				},
				isSigned: true,
				clinicName: "Клиника ДЕНТЕ",
			});

			assert.ok(html.includes("Вкладыш в медицинскую карту стоматологического пациента № 043/у"));
			assert.ok(html.includes("Смирнов Алексей Петрович"));
			assert.ok(html.includes("043-8821"));
			assert.ok(html.includes("Д-р Кузнецова М.В."));
			assert.ok(html.includes("K02.1 Кариес дентина"));
			assert.ok(html.includes("Ceram.x Spectra"));
			assert.ok(html.includes("Подписано врачом"));
			assert.strictEqual(hasCartoonEmojis(html), false, "Examination diary sheet must contain 0 cartoon emojis");
		});

		it("generates surgery post-extraction patient memo with emergency instructions and zero emojis", () => {
			const memo = buildFastPrintPatientMemoHtml({
				activePatient: { fullName: "Петров Василий Иванович" },
				activeDoctor: { fullName: "Д-р Сидоров А.П." },
				interventionType: "surgery_extraction",
				toothNumber: 38,
				clinicName: "ДЕНТЕ Хирургия",
				emergencyPhone: "+7 (495) 123-45-67",
			});

			assert.ok(memo.includes("Памятка пациенту после хирургического вмешательства (зуб 38)"));
			assert.ok(memo.includes("Петров Василий Иванович"));
			assert.ok(memo.includes("Удерживать марлевый тампон прижатым 15–20 минут"));
			assert.ok(memo.includes("Категорически запрещено полоскать полость рта"));
			assert.ok(memo.includes("+7 (495) 123-45-67"));
			assert.strictEqual(hasCartoonEmojis(memo), false, "Patient memo must contain 0 cartoon emojis");
		});

		it("calculates DMFT (КПУ) index accurately from odontogram state", () => {
			const teethFormula = {
				16: { state: "caries" },
				24: { status: "pulpitis" },
				36: { state: "fill" },
				37: { status: "crown" },
				46: { state: "extracted" },
				11: { state: "healthy" },
			};

			const dmft = normalizeOdontogramForDmft(teethFormula);
			assert.strictEqual(dmft.decayed, 2, "Caries (16) + Pulpitis (24) = 2 decayed");
			assert.strictEqual(dmft.filled, 2, "Fill (36) + Crown (37) = 2 filled");
			assert.strictEqual(dmft.missing, 1, "Extracted (46) = 1 missing");
			assert.strictEqual(dmft.total, 5, "Total DMFT = 5");
		});

		it("extracts clinic requisites with fallback defaults", () => {
			const req = extractClinicRequisites(null);
			assert.ok(req.clinicName.includes("клиника") || req.clinicName.includes("DENTE"));
			assert.strictEqual(req.clinicInn, "—");
			assert.strictEqual(req.license, "—");
			assert.strictEqual(req.clinicAddress, "—");
		});
	});

	describe("2. EMK Presets & clinicalDiagnosesSsot Integration", () => {
		it("buildEmkHealthyComplaintsAndAnamnesisPreset returns canonical norm", () => {
			const preset = buildEmkHealthyComplaintsAndAnamnesisPreset();
			assert.strictEqual(preset.isHealthyNorm, true);
			assert.strictEqual(preset.anamnesis, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);
			assert.ok(preset.complaint.includes("профилактический осмотр"));
		});

		it("applySomaticQuickChipToAnamnesis toggles somatic chips without data corruption", () => {
			const penicillinChip = SOMATIC_QUICK_CHIPS.find((c) => c.id === "penicillin")!;
			assert.ok(penicillinChip);

			// Add penicillin to healthy norm
			const withPenicillin = applySomaticQuickChipToAnamnesis(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT, penicillinChip);
			assert.ok(withPenicillin.includes("Пенициллин"));

			// Remove penicillin
			const withoutPenicillin = applySomaticQuickChipToAnamnesis(withPenicillin, penicillinChip);
			assert.strictEqual(withoutPenicillin, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);
		});

		it("buildDiagnosisProtocolFromSsot assembles complete SOAP protocol from clinicalDiagnosesSsot", () => {
			// Caries K02.1
			const cariesProtocol = buildDiagnosisProtocolFromSsot("K02.1", 16);
			assert.ok(cariesProtocol);
			assert.strictEqual(cariesProtocol.diagnosisEntry.icd10, "K02.1");
			assert.ok(cariesProtocol.formattedDiagnosis.includes("Зуб 16: K02.1"));
			assert.ok(cariesProtocol.complaints.includes("температурных"));
			assert.ok(cariesProtocol.treatmentPlan.toLowerCase().includes("препарирование"));
			assert.ok((cariesProtocol.order804nServices?.length ?? 0) > 0);

			// Pulpitis K04.0
			const pulpitisProtocol = buildDiagnosisProtocolFromSsot("K04.0", 25);
			assert.ok(pulpitisProtocol);
			assert.strictEqual(pulpitisProtocol.diagnosisEntry.icd10, "K04.0");
			assert.ok(pulpitisProtocol.formattedDiagnosis.includes("Зуб 25: K04.0"));
			assert.ok(
				pulpitisProtocol.treatmentPlan.toLowerCase().includes("экстирпация") ||
				pulpitisProtocol.treatmentPlan.toLowerCase().includes("канал")
			);

			// Unknown returns null
			assert.strictEqual(buildDiagnosisProtocolFromSsot("NON_EXISTENT_ICD"), null);
		});

		it("getOutpatientDiagnosesForQuickPicker filters diagnoses by category and query", () => {
			const all = getOutpatientDiagnosesForQuickPicker("all");
			assert.strictEqual(all.length, CLINICAL_DIAGNOSES_SSOT.length);

			const cariesList = getOutpatientDiagnosesForQuickPicker("caries");
			assert.ok(cariesList.length > 0);
			assert.ok(cariesList.every((d) => d.category === "caries"));

			const searchCaries = getOutpatientDiagnosesForQuickPicker(undefined, "кариес");
			assert.ok(searchCaries.length > 0);
			assert.ok(searchCaries.some((d) => d.icd10 === "K02.1"));
		});
	});

	describe("3. Intake Cockpit Somatic Stop-Factors & Vital Signs", () => {
		it("createDefaultNormalVitalSigns returns standard physiological norm", () => {
			const v = createDefaultNormalVitalSigns();
			assert.strictEqual(v.systolicBp, 120);
			assert.strictEqual(v.diastolicBp, 80);
			assert.strictEqual(v.pulseBpm, 72);
			assert.strictEqual(v.temperatureC, 36.6);
		});

		it("evaluateIntakeAdrenalineContraindication assesses adrenaline safety without blocking doctor", () => {
			// Case A: Normal vitals -> adrenaline safe
			const normalAssessment = evaluateIntakeAdrenalineContraindication({
				systolicBp: 120,
				diastolicBp: 80,
				pulseBpm: 72,
				temperatureC: 36.6,
			}, false);
			assert.strictEqual(normalAssessment.isAdrenalineContraindicated, false);
			assert.strictEqual(normalAssessment.isHighBpCrisis, false);

			// Case B: High BP crisis (>= 160/100) -> flags Mepivacaine 3% without vasoconstrictor
			const crisisAssessment = evaluateIntakeAdrenalineContraindication({
				systolicBp: 170,
				diastolicBp: 105,
				pulseBpm: 88,
				temperatureC: 36.6,
			}, false);
			assert.strictEqual(crisisAssessment.isAdrenalineContraindicated, true);
			assert.strictEqual(crisisAssessment.isHighBpCrisis, true);
			assert.ok(crisisAssessment.recommendedAnestheticHintRu.includes("Мепивакаин 3%"));

			// Case C: CVD stop factor active -> flags 1:200 000 restriction
			const cvdAssessment = evaluateIntakeAdrenalineContraindication({
				systolicBp: 125,
				diastolicBp: 82,
				pulseBpm: 74,
				temperatureC: 36.6,
			}, true);
			assert.strictEqual(cvdAssessment.isAdrenalineContraindicated, true);
			assert.strictEqual(cvdAssessment.isHighBpCrisis, false);
			assert.ok(cvdAssessment.recommendedAnestheticHintRu.includes("1:200 000"));
		});

		it("toggles intake somatic stop-factors and allergens cleanly", () => {
			let state = createDefaultHealthyIntakeSomaticState();
			assert.strictEqual(state.isHealthyNorm, true);

			// Toggle articaine allergy
			state = toggleIntakeAllergen(state, "articaine");
			assert.strictEqual(state.isHealthyNorm, false);
			assert.ok(state.selectedAllergenIds.includes("articaine"));
			assert.ok(state.summaryAnamnesisTextRu.includes("Артикаин"));

			// Toggle pacemaker stop-factor
			state = toggleIntakeStopFactor(state, "pacemaker_exs");
			assert.ok(state.selectedStopFactorIds.includes("pacemaker_exs"));
			assert.ok(state.summaryAnamnesisTextRu.includes("Кардиостимулятор") || state.summaryAnamnesisTextRu.includes("ЭКС"));

			// Toggle hypertension chip
			state = toggleIntakeSomaticChip(state, "hypertension");
			assert.ok(state.selectedQuickChipIds.includes("hypertension"));
			assert.ok(state.summaryAnamnesisTextRu.includes("Гипертония"));

			// Untoggle all back to norm
			state = toggleIntakeAllergen(state, "articaine");
			state = toggleIntakeStopFactor(state, "pacemaker_exs");
			state = toggleIntakeSomaticChip(state, "hypertension");
			assert.strictEqual(state.isHealthyNorm, true);
			assert.strictEqual(state.summaryAnamnesisTextRu, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);
		});

		it("buildIntakeSomaticSummaryText produces healthy norm when empty", () => {
			const text = buildIntakeSomaticSummaryText([], [], []);
			assert.strictEqual(text, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);
		});
	});

	describe("4. Architectural Line Limits and Anti-Emoji Verification", () => {
		const webSrc = path.resolve(__dirname, "../../..");

		const filesToCheckLimits = [
			{ path: "components/visit/VisitEmkTab.tsx", maxLines: 250 },
			{ path: "components/visit/VisitIntakeCockpit.tsx", maxLines: 250 },
			{ path: "components/visit/view/visitFastPrint.ts", maxLines: 250 },
			{ path: "components/visit/emkTabModules/emkTabTypes.ts", maxLines: 500 },
			{ path: "components/visit/emkTabModules/EmkComplaintsAndAnamnesisSection.tsx", maxLines: 500 },
			{ path: "components/visit/emkTabModules/EmkDiagnosisAndProtocolSection.tsx", maxLines: 500 },
			{ path: "components/visit/emkTabModules/useVisitEmkTabController.ts", maxLines: 500 },
			{ path: "components/visit/intakeCockpitModules/intakeCockpitTypes.ts", maxLines: 500 },
			{ path: "components/visit/intakeCockpitModules/IntakeSomaticCheckboxesGrid.tsx", maxLines: 500 },
			{ path: "components/visit/intakeCockpitModules/IntakeVitalSignsBar.tsx", maxLines: 500 },
			{ path: "components/visit/intakeCockpitModules/IntakeQueueListColumn.tsx", maxLines: 500 },
			{ path: "components/visit/intakeCockpitModules/IntakePatientsCardGridColumn.tsx", maxLines: 500 },
			{ path: "components/visit/intakeCockpitModules/IntakeQueueAndSearchSection.tsx", maxLines: 500 },
			{ path: "components/visit/view/fastPrintModules/fastPrintDiaryBuilder.ts", maxLines: 500 },
			{ path: "components/visit/view/fastPrintModules/fastPrintConsentAndMemoBuilder.ts", maxLines: 500 },
		];

		for (const item of filesToCheckLimits) {
			it(`verifies ${item.path} is <= ${item.maxLines} lines and contains 0 cartoon emojis`, () => {
				const fullPath = path.join(webSrc, item.path);
				assert.ok(fs.existsSync(fullPath), `File must exist: ${item.path}`);
				const content = fs.readFileSync(fullPath, "utf-8");
				const lineCount = content.split(/\r?\n/).length;

				assert.ok(
					lineCount <= item.maxLines,
					`File ${item.path} has ${lineCount} lines, must be <= ${item.maxLines}`,
				);
				assert.strictEqual(
					hasCartoonEmojis(content),
					false,
					`File ${item.path} must contain 0 cartoon emojis`,
				);
			});
		}
	});
});
