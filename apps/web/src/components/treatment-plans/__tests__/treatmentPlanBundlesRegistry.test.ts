/**
 * treatmentPlanBundlesRegistry.test.ts — тестирование 10 канонических пакетов «под ключ».
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { parseKopecks } from "@dental/shared";
import {
	CLINICAL_BUNDLES,
	type ClinicalBundleId,
	getClinicalBundleById,
} from "../treatmentPlanBundlesEngine";

describe("treatmentPlanBundlesEngine — Реестр канонических пакетов", () => {
	test("реестр содержит ровно 10 канонических пакетов", () => {
		assert.equal(CLINICAL_BUNDLES.length, 10);
		const expectedIds: ClinicalBundleId[] = [
			"caries_turnkey",
			"endo_1canal_turnkey",
			"endo_3canal_turnkey",
			"hygiene_turnkey",
			"extraction_turnkey",
			"complex_extraction",
			"implant_turnkey",
			"crown_metalloceramic_turnkey",
			"crown_zirconia_turnkey",
			"impression_asilicone_2jaws",
		];
		assert.deepEqual(CLINICAL_BUNDLES.map((b) => b.id), expectedIds);
	});

	test("математическая сумма позиций каждого пакета строго равна заявленной стоимости", () => {
		for (const bundle of CLINICAL_BUNDLES) {
			const itemSumRub = bundle.items.reduce((acc, it) => acc + it.defaultPriceRub, 0);
			assert.equal(itemSumRub, bundle.totalPriceRub);
			assert.equal(bundle.totalPriceKopecks, parseKopecks(bundle.totalPriceRub));
		}
	});

	test("все позиции пакетов имеют валидный код каталога процедур, материалы и обоснование", () => {
		for (const bundle of CLINICAL_BUNDLES) {
			assert.ok(bundle.items.length > 0);
			for (const item of bundle.items) {
				assert.match(item.serviceCode || item.code804n || "", /^[AB]\d{2}\.\d{2}\.\d{3}(\.\d{3})?$/);
				assert.ok(item.materials.length > 5);
				assert.ok(item.clinicalRationale.length > 10);
				assert.ok(item.defaultPriceRub > 0);
			}
		}
	});

	test("пакеты корректно распределены по клиническим этапам", () => {
		assert.equal(getClinicalBundleById("caries_turnkey")?.stageKind, "stage_1_therapy");
		assert.equal(getClinicalBundleById("endo_1canal_turnkey")?.stageKind, "stage_1_therapy");
		assert.equal(getClinicalBundleById("endo_3canal_turnkey")?.stageKind, "stage_1_therapy");
		assert.equal(getClinicalBundleById("hygiene_turnkey")?.requiresTooth, false);
		assert.equal(getClinicalBundleById("extraction_turnkey")?.stageKind, "stage_2_surgery");
		assert.equal(getClinicalBundleById("complex_extraction")?.requiresTooth, true);
		assert.equal(getClinicalBundleById("implant_turnkey")?.stageKind, "stage_2_surgery");
		assert.equal(getClinicalBundleById("crown_metalloceramic_turnkey")?.stageKind, "stage_3_orthopedics");
		assert.equal(getClinicalBundleById("crown_zirconia_turnkey")?.stageKind, "stage_3_orthopedics");
		assert.equal(getClinicalBundleById("impression_asilicone_2jaws")?.requiresTooth, false);
	});
});
