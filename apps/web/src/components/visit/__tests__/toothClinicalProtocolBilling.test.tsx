/**
 * toothClinicalProtocolBilling.test.tsx
 *
 * DENTE Dental CRM — Canonical Clinical Treatment Packages & Visit Billing Integration
 * (CANONICAL_DIAGNOSIS_BUNDLES -> useVisitStore.ts -> Chairside Billing SSOT)
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (1-click batch protocol addition without bureaucratic friction).
 * - Mandate 8k: CRM != Reality Simulator (Dynamic clinical packages directly into visit billing).
 * - Mandate 8d: Zero Cartoon Emojis (Strictly vector icons & professional typography).
 * - Mandate 8x/8ap: Clean Language (Zero bird-language / raw regulatory codes in clinical UI labels).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CANONICAL_DIAGNOSIS_BUNDLES,
	CARIES_DIAGNOSIS_BUNDLE,
	PULPITIS_DIAGNOSIS_BUNDLE,
	EXTRACTION_DIAGNOSIS_BUNDLE,
	HYGIENE_DIAGNOSIS_BUNDLE,
	getDiagnosisBundleByToothState,
	getDiagnosisBundleByIcd10,
	createCustomizedBundle,
	exportCustomizedBundleToCashier54Fz,
} from "@dental/shared";
import { useVisitStore } from "../../../store/visitStore";

// Cartoon emoji detector per Mandate 8d
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

// Bird-language detector: strict ban on dev-jargon and raw regulatory jargon in patient-facing UI
const BIRD_LANGUAGE_REGEX =
	/(?:мандат|мандеит|ффд\s*1\.2|ккт\s*54|54-фз|804н\s*в\s*счет|1-клик\s*допуск|без\s*\d+\s*чекбокс)/i;

describe("Canonical Clinical Treatment Packages & Tooth Billing Integration", () => {
	it("CANONICAL_DIAGNOSIS_BUNDLES registry contains primary clinical pathologies", () => {
		assert.ok(CANONICAL_DIAGNOSIS_BUNDLES.length >= 5, "At least 5 canonical diagnosis bundles must exist");
		assert.ok(CARIES_DIAGNOSIS_BUNDLE, "Caries bundle must exist");
		assert.ok(PULPITIS_DIAGNOSIS_BUNDLE, "Pulpitis bundle must exist");
		assert.ok(EXTRACTION_DIAGNOSIS_BUNDLE, "Extraction bundle must exist");
		assert.ok(HYGIENE_DIAGNOSIS_BUNDLE, "Hygiene bundle must exist");
	});

	it("resolves diagnosis bundle dynamically by tooth state and ICD-10", () => {
		const cariesByState = getDiagnosisBundleByToothState("Caries");
		assert.ok(cariesByState, "Caries bundle by state exists");
		assert.equal(cariesByState?.id, CARIES_DIAGNOSIS_BUNDLE.id);

		const pulpitisByState = getDiagnosisBundleByToothState("Pulpitis");
		assert.ok(pulpitisByState, "Pulpitis bundle by state exists");
		assert.equal(pulpitisByState?.id, PULPITIS_DIAGNOSIS_BUNDLE.id);

		const cariesByIcd = getDiagnosisBundleByIcd10("K02.1");
		assert.ok(cariesByIcd, "Caries by ICD K02.1 exists");
		assert.equal(cariesByIcd?.diagnosisIcd10, "K02.1");

		const pulpitisByIcd = getDiagnosisBundleByIcd10("K04.0");
		assert.ok(pulpitisByIcd, "Pulpitis by ICD K04.0 exists");
		assert.equal(pulpitisByIcd?.diagnosisIcd10, "K04.0");
	});

	it("creates customized bundle with tooth binding and exact kopecks calculation", () => {
		const customized = createCustomizedBundle(CARIES_DIAGNOSIS_BUNDLE, {
			toothCode: "16",
		});

		assert.equal(customized.bundleId, CARIES_DIAGNOSIS_BUNDLE.id);
		assert.ok(customized.items.length > 0, "Bundle must contain services");
		assert.ok(customized.totalKopecks > 0, "Total kopecks must be positive");
		assert.equal(customized.totalRub, customized.totalKopecks / 100, "Rubles match kopecks conversion");

		for (const item of customized.items) {
			assert.equal(item.toothCode, "16", "All bundle items bound to tooth 16");
			assert.ok(item.priceKopecks > 0, "Price in kopecks must be positive");
			assert.ok(item.code804n.startsWith("A"), "Nomenclature code must follow official format");
		}
	});

	it("exports customized bundle to cashier payload with valid 54-FZ data structures", () => {
		const customized = createCustomizedBundle(PULPITIS_DIAGNOSIS_BUNDLE, {
			toothCode: "46",
		});

		const cashierExport = exportCustomizedBundleToCashier54Fz(customized, {
			patientId: "pat-test-1",
			visitId: "vis-test-1",
			toothNumber: 46,
		});

		assert.equal(cashierExport.patientId, "pat-test-1");
		assert.equal(cashierExport.visitId, "vis-test-1");
		assert.equal(cashierExport.toothNumber, 46);
		assert.equal(cashierExport.totalKopecks, customized.totalKopecks);
		assert.equal(cashierExport.receiptItems.length, customized.checkedCount);

		for (const item of cashierExport.receiptItems) {
			assert.equal(item.toothNumber, 46);
			assert.equal(item.toothCode, "46");
			assert.ok(item.sumKopecks > 0);
			assert.ok(item.priceKopecks > 0);
		}
	});

	it("All canonical packages have zero cartoon emojis and zero regulatory bird-language in titles", () => {
		for (const bundle of CANONICAL_DIAGNOSIS_BUNDLES) {
			assert.ok(!hasCartoonEmojis(bundle.bundleTitle), `Bundle ${bundle.id} title has emojis`);
			assert.ok(!hasCartoonEmojis(bundle.diagnosisTitle), `Bundle ${bundle.id} diagnosisTitle has emojis`);
			assert.ok(!BIRD_LANGUAGE_REGEX.test(bundle.bundleTitle), `Bundle ${bundle.id} title has bird-language`);
			for (const svc of bundle.services) {
				assert.ok(!hasCartoonEmojis(svc.title), `Service ${svc.id} title has emojis`);
				assert.ok(!BIRD_LANGUAGE_REGEX.test(svc.title), `Service ${svc.id} title has bird-language`);
			}
		}
	});

	it("batch dispatches protocol services to useVisitStore with tooth binding and kopecks integrity", () => {
		useVisitStore.setState({ completedServices: [] });

		const initialServices = useVisitStore.getState().completedServices;
		assert.equal(initialServices.length, 0);

		const toothCode = "46";
		const toothNum = 46;
		const customized = createCustomizedBundle(PULPITIS_DIAGNOSIS_BUNDLE, {
			toothCode,
		});

		for (const item of customized.items) {
			useVisitStore.getState().addCompletedService({
				serviceId: `${item.serviceId}-${toothCode}`,
				code804n: item.code804n,
				name: item.title,
				priceRub: item.priceRub,
				priceKopecks: item.priceKopecks,
				quantity: 1,
				category: item.category,
				toothNumber: toothNum,
				toothCode: toothCode,
			});
		}

		useVisitStore.getState().applyServicesToToothState({
			toothNumber: toothNum,
			toothCode: toothCode,
			services: customized.items.map((it) => ({
				code804n: it.code804n,
				title: it.title,
				price: it.priceRub,
				toothNumber: toothNum,
				toothCode: toothCode,
			})),
		});

		const updatedServices = useVisitStore.getState().completedServices;
		assert.equal(updatedServices.length, customized.items.length, "Store contains all bundle services");

		for (const svc of updatedServices) {
			assert.equal(svc.toothCode, "46");
			assert.equal(svc.toothNumber, 46);
			assert.ok(svc.priceRub > 0);
			assert.ok(svc.priceKopecks > 0);
			assert.equal(svc.priceKopecks, Math.round(svc.priceRub * 100));
		}

		const totalSumKopecks = updatedServices.reduce((sum, s) => sum + s.priceKopecks, 0);
		assert.equal(totalSumKopecks, customized.totalKopecks, "Total sum matches customized bundle kopecks");
	});
});
