/**
 * cbctFindingsAndBundlesBridge.test.ts — автоизвлечение находок КЛКТ и клинические бандлы.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { extractCbctFindingsFromOdontogramAndStorage } from "../ctImplantIntegrationBridge";
import {
	CBCT_CLINICAL_BUNDLES,
	applyClinicalBundleToStages,
	calculateBundlePrice,
	getCbctBundleById,
} from "../treatmentPlanBundlesEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanStage } from "../types";

describe("cbctAutoPlanIntegrationBridge — Находки КЛКТ и клинические бандлы", () => {
	test("корректно извлекает отсутствующие зубы как кандидаты на имплантацию", () => {
		const testTeeth: ToothData[] = [
			{ toothNumber: 46, state: "Missing", notes: "Удален 2 года назад" },
			{ toothNumber: 16, state: "Missing", notes: "Отсутствует" },
			{ toothNumber: 47, state: "Periodontitis", notes: "Периапикальный очаг" },
		];

		const findings = extractCbctFindingsFromOdontogramAndStorage("PAT-EXTRACT-1", testTeeth);
		assert.ok(findings.implants && findings.implants.length >= 2);
		const fdiList = findings.implants.map((i) => i.toothFdi);
		assert.ok(fdiList.includes(46));
		assert.ok(fdiList.includes(16));

		const sinusDefects = findings.boneDefects?.filter((d) => d.toothFdi === 16);
		assert.ok(sinusDefects && sinusDefects.length > 0);
	});

	test("предоставляет безопасный фоллбэк с имплантатом #46 при полностью чистой одонтограмме", () => {
		const findings = extractCbctFindingsFromOdontogramAndStorage("PAT-EMPTY", []);
		assert.ok(findings.implants && findings.implants.length > 0);
		assert.equal(findings.implants[0]!.toothFdi, 46);
		assert.ok(findings.toothDestructions && findings.toothDestructions.length > 0);
	});

	test("реестр пакетов КЛКТ содержит 3 специализированных пакета", () => {
		assert.equal(CBCT_CLINICAL_BUNDLES.length, 3);
		const ids = CBCT_CLINICAL_BUNDLES.map((b) => b.id);
		assert.ok(ids.includes("sinus_lift_closed_turnkey" as any));
		assert.ok(ids.includes("sinus_lift_open_turnkey" as any));
		assert.ok(ids.includes("crown_implant_zirconia_turnkey" as any));
	});

	test("getCbctBundleById находит пакеты по идентификаторам", () => {
		const closedLift = getCbctBundleById("sinus_lift_closed_turnkey");
		assert.ok(closedLift);
		assert.equal(closedLift.category, "surgery");
		assert.equal(closedLift.totalPriceRub, 32900);

		const openLift = getCbctBundleById("sinus_lift_open_turnkey");
		assert.ok(openLift);
		assert.equal(openLift.category, "surgery");
		assert.equal(openLift.totalPriceRub, 64200);

		const crownZr = getCbctBundleById("crown_implant_zirconia_turnkey");
		assert.ok(crownZr);
		assert.equal(crownZr.category, "orthopedics");
		assert.equal(crownZr.totalPriceRub, 37000);
	});

	test("calculateBundlePrice рассчитывает стоимость пакета КЛКТ с исключением опций", () => {
		const breakdown = calculateBundlePrice("sinus_lift_closed_turnkey" as any, ["closed_lift", "bio_oss"]);
		assert.equal(breakdown.totalRub, 32000);
		assert.equal(breakdown.excludedItems.length, 1);
		assert.equal(breakdown.excludedItems[0]!.id, "anesthesia");
	});

	test("applyClinicalBundleToStages интегрирует открытый синус-лифтинг в хирургический этап", () => {
		const initialStages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Этап I: Терапия",
				subtitle: "Санация",
				clinicalGoal: "Лечение кариеса",
				items: [],
				totalRub: 0,
				totalKopecks: 0 as any,
				estimatedVisits: 1,
				estimatedWeeks: 1,
				order804nCodes: [],
				status: "agreed",
			},
		];

		const updatedStages = applyClinicalBundleToStages(
			initialStages,
			"sinus_lift_open_turnkey" as any,
			{ toothNumber: 16 },
		);

		assert.equal(updatedStages.length, 2);
		const surgStage = updatedStages.find((s) => s.stageKind === "stage_2_surgery")!;
		assert.equal(surgStage.items.length, 5);
		assert.equal(surgStage.totalRub, 64200);
		assert.ok(surgStage.items[0]!.name.includes("Зуб 16"));
	});
});
