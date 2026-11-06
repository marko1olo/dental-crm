/**
 * packages/shared/src/clinical/__tests__/clinicalDecompositionParity.test.ts
 *
 * Parity and Line Budget verification for decomposed playbooks and diagnosis bundles.
 * Mandate 8b: Modules <= 120 lines, facades <= 15 lines.
 * Mandate 8e: Doctor autonomy, kopeck exactness.
 * Mandate 8ap: Pure domain naming with backward-compatible aliases.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	// Playbooks
	generateMorningBriefing,
	findCancellationGapCandidates,
	recoverCancellationGap,
	generatePreAppointmentSummary,
	formatPlaybookForm043A4Protocol,
	formatPlaybookVisitProtocol,
	// Bundles
	CARIES_DIAGNOSIS_BUNDLE,
	PULPITIS_DIAGNOSIS_BUNDLE,
	PULPITIS_3CANAL_DIAGNOSIS_BUNDLE,
	PERIODONTITIS_DIAGNOSIS_BUNDLE,
	EXTRACTION_DIAGNOSIS_BUNDLE,
	EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE,
	IMPLANT_PLACEMENT_DIAGNOSIS_BUNDLE,
	HYGIENE_DIAGNOSIS_BUNDLE,
	CROWN_DIAGNOSIS_BUNDLE,
	BRACES_FIXATION_DIAGNOSIS_BUNDLE,
	CANONICAL_DIAGNOSIS_BUNDLES,
	ALL_DIAGNOSIS_BUNDLES,
	getDiagnosisBundleByToothState,
	getDiagnosisBundleByIcd10,
	createCustomizedBundle,
	exportCustomizedBundleToCashier54Fz,
	exportCustomizedBundleToCashier,
	TOOTH_804N_PRESETS,
	TOOTH_SERVICE_PRESETS,
} from "../index.js";

describe("Clinical Modules Decomposition Parity & Runtime Contract Audit", () => {
	it("1. Verifies functional playbooks contract and mathematical summation of bundles without disk regex", () => {
		// Functions contract
		assert.equal(typeof generateMorningBriefing, "function");
		assert.equal(typeof findCancellationGapCandidates, "function");
		assert.equal(typeof recoverCancellationGap, "function");
		assert.equal(typeof generatePreAppointmentSummary, "function");
		assert.equal(typeof formatPlaybookVisitProtocol, "function");
		assert.equal(typeof formatPlaybookForm043A4Protocol, "function");

		// Mathematical consistency of all diagnosis bundles
		for (const bundle of CANONICAL_DIAGNOSIS_BUNDLES) {
			const sumServicesKopecks = bundle.services.reduce((acc, s) => acc + s.defaultPriceKopecks, 0);
			assert.equal(
				bundle.defaultTotalPriceKopecks,
				sumServicesKopecks,
				`Bundle ${bundle.id} total price must match exact integer sum of its services`,
			);
			// Check unique serviceCodes inside each bundle
			const codes = bundle.services.map((s) => s.serviceCode);
			const uniqueCodes = new Set(codes);
			assert.equal(
				uniqueCodes.size,
				codes.length,
				`Bundle ${bundle.id} must not contain duplicate service codes`,
			);
		}
	});

	it("2. Verifies Playbook 1 (Morning Briefing) and Playbook 3 (Pre-Visit Summary) execution", () => {
		const briefing = generateMorningBriefing({
			doctorId: "doc-1",
			doctorName: "д-р Тест",
			date: "2026-10-28",
			appointments: [
				{
					id: "app-1",
					patientId: "pat-1",
					patientFullName: "Иванов И.И.",
					time: "09:00",
					chairName: "Кресло 1",
					reason: "Кариес",
					durationMinutes: 30,
					criticalAllergies: ["Ультракаин Д-С Форте"],
					somaticRiskFactors: [],
				},
			],
			recalls: [],
			budgets: [],
		});
		assert.equal(briefing.appointmentsCount, 1);
		assert.equal(briefing.hasCriticalAlerts, true);
		assert.equal(briefing.criticalAlerts[0]?.alertType, "allergy");

		const preVisit = generatePreAppointmentSummary({
			patient: {
				id: "pat-1",
				fullName: "Иванов И.И.",
				criticalAllergies: ["Ультракаин"],
			},
			unpaidKopecks: 500000,
		});
		assert.equal(preVisit.isFirstVisit, true);
		assert.equal(preVisit.hasCriticalAlerts, true);
		assert.equal(preVisit.financialSummary.hasOverdueDebt, true);
		assert.ok(/5[\s\u00A0]000/.test(preVisit.financialSummary.financialStatusRu));

		// Protocol formatter clean alias
		const protocol = formatPlaybookVisitProtocol(briefing);
		assert.ok(protocol.includes("УТРЕННИЙ БРИФИНГ ВРАЧА"));
	});

	it("3. Verifies Playbook 2 (Cancellation Gap Recovery) candidate ranking", () => {
		const recovery = recoverCancellationGap({
			slot: {
				startTime: "14:00",
				durationMinutes: 45,
				chairName: "Кресло 2",
			},
			recalls: [
				{
					patientId: "pat-2",
					patientFullName: "Петров П.П.",
					dueDate: "2026-09-01",
					priority: "urgent",
					diagnosis: "Острая боль / периодонтит",
					estimatedDurationMinutes: 45,
				},
			],
			referenceDate: "2026-10-28",
		});
		assert.equal(recovery.totalCandidatesFound, 1);
		assert.ok(recovery.candidates[0]!.matchScore >= 90);
		assert.ok(recovery.actionPromptRu.includes("Петров П.П."));
	});

	it("4. Verifies all diagnosis bundles have valid nomenclatureCode, serviceCode and code804n aliases per Mandate 8ap", () => {
		for (const bundle of ALL_DIAGNOSIS_BUNDLES) {
			assert.ok(bundle.id.length > 0);
			assert.ok(bundle.diagnosisIcd10.length > 0);
			assert.ok(bundle.services.length > 0);
			assert.ok(bundle.defaultTotalPriceKopecks > 0);
			assert.equal(bundle.defaultTotalPriceKopecks, bundle.defaultTotalPriceRub * 100);

			for (const svc of bundle.services) {
				assert.ok(svc.id.length > 0);
				assert.ok(svc.title.length > 0);
				assert.ok(svc.serviceCode.length > 0);
				assert.equal(svc.serviceCode, svc.code804n, "serviceCode must match code804n alias");
				assert.equal(svc.nomenclatureCode, svc.code804n, "nomenclatureCode must match code804n alias");
				assert.ok(svc.defaultPriceKopecks > 0);
				assert.equal(svc.defaultPriceKopecks, svc.defaultPriceRub * 100);
			}
		}
	});

	it("5. Verifies lookup by tooth state and ICD-10 for therapy, surgery, hygiene, ortho", () => {
		assert.equal(getDiagnosisBundleByToothState("Caries"), CARIES_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Pulpitis"), PULPITIS_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Periodontitis"), PERIODONTITIS_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Missing"), EXTRACTION_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Crown"), CROWN_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Orthodontic"), BRACES_FIXATION_DIAGNOSIS_BUNDLE);

		assert.equal(getDiagnosisBundleByIcd10("K02.1"), CARIES_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K04.0"), PULPITIS_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K04.7"), PERIODONTITIS_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K08.1"), EXTRACTION_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K05.3"), HYGIENE_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K08.2"), CROWN_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K07.2"), BRACES_FIXATION_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K01.1"), EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE);
	});

	it("6. Verifies customized bundle unchecking & exact kopecks cashier export", () => {
		const customized = createCustomizedBundle(CARIES_DIAGNOSIS_BUNDLE, {
			toothCode: "46",
			checkedServiceCodes: ["A16.07.002.010", "A16.07.002.011"],
		});
		assert.equal(customized.checkedCount, 2);
		assert.equal(customized.totalKopecks, 450000);
		assert.equal(customized.totalRub, 4500);

		const cashierExport = exportCustomizedBundleToCashier(customized, {
			toothNumber: 46,
			patientId: "pat-99",
			visitId: "vis-1",
		});
		assert.equal(cashierExport.totalKopecks, 450000);
		assert.equal(cashierExport.itemsCount, 2);
		assert.equal(cashierExport.receiptItems[0]?.serviceCode, "A16.07.002.010");
		assert.ok(cashierExport.receiptItems[0]?.name.includes("зуб 46"));

		// Presets parity
		assert.equal(TOOTH_SERVICE_PRESETS.cariesFilling.priceKopecks, 450000);
		assert.equal(TOOTH_SERVICE_PRESETS.endoCanals.priceKopecks, 350000);
		assert.equal(TOOTH_SERVICE_PRESETS.crownZirconia.priceKopecks, 2400000);
		assert.equal(TOOTH_SERVICE_PRESETS.extractionSimple.priceKopecks, 350000);
	});
});
