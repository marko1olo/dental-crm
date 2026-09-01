/**
 * packages/shared/src/curator/curatorEngine.test.ts
 *
 * Тесты чистого движка куратора лечения:
 *  - 5-этапная воронка
 *  - Точный расчет конверсии
 *  - Сдельная комиссия в копейках без потерь точности
 *  - Фильтрация и приоритизация очереди пациентов
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	advancePatientFunnelStage,
	calculateCuratorCommission,
	calculateCuratorMetrics,
	evaluatePatientUrgency,
	filterAndSortCuratorQueue,
} from "./curatorEngine.js";
import type { CuratorPatientQueueItem } from "./types.js";

const sampleCuratorQueue: CuratorPatientQueueItem[] = [
	{
		patientId: "11111111-1111-4111-8111-111111111111",
		patientFullName: "Иванов Иван Иванович",
		patientPhone: "+7 (999) 111-22-33",
		treatmentPlanId: "22222222-2222-4222-8222-222222222221",
		treatmentPlanTitle: "Комплексная имплантация All-on-4",
		planTier: "premium",
		planTotalPriceRub: 240_000,
		planTotalPriceKopecks: 24_000_000,
		paidAmountRub: 240_000,
		paidAmountKopecks: 24_000_000,
		remainingAmountRub: 0,
		remainingAmountKopecks: 0,
		funnelStage: "completed",
		curatorId: "33333333-3333-4333-8333-333333333331",
		curatorFullName: "Смирнова Анна (Куратор)",
		assignedAt: "2026-08-01T10:00:00.000Z",
		stageUpdatedAt: "2026-08-20T14:00:00.000Z",
		daysInStage: 1,
		doctorId: "44444444-4444-4444-8444-444444444441",
		doctorFullName: "Петров П.П. (Хирург)",
		priorityScore: 10,
		attentionFlags: [],
	},
	{
		patientId: "11111111-1111-4111-8111-111111111112",
		patientFullName: "Сидорова Елена Сергеевна",
		patientPhone: "+7 (999) 222-33-44",
		treatmentPlanId: "22222222-2222-4222-8222-222222222222",
		treatmentPlanTitle: "Керамические виниры E-max (6 единиц)",
		planTier: "premium",
		planTotalPriceRub: 180_000,
		planTotalPriceKopecks: 18_000_000,
		paidAmountRub: 90_000,
		paidAmountKopecks: 9_000_000,
		remainingAmountRub: 90_000,
		remainingAmountKopecks: 9_000_000,
		funnelStage: "treatment_start",
		curatorId: "33333333-3333-4333-8333-333333333331",
		curatorFullName: "Смирнова Анна (Куратор)",
		assignedAt: "2026-08-10T10:00:00.000Z",
		stageUpdatedAt: "2026-08-15T14:00:00.000Z",
		daysInStage: 5,
		doctorId: "44444444-4444-4444-8444-444444444442",
		doctorFullName: "Кузнецов К.К. (Ортопед)",
		priorityScore: 65,
		attentionFlags: ["high_value_plan"],
	},
	{
		patientId: "11111111-1111-4111-8111-111111111113",
		patientFullName: "Ковалев Дмитрий Андреевич",
		patientPhone: "+7 (999) 333-44-55",
		treatmentPlanId: "22222222-2222-4222-8222-222222222223",
		treatmentPlanTitle: "Лечение кариеса и профессиональная гигиена",
		planTier: "basic",
		planTotalPriceRub: 25_000,
		planTotalPriceKopecks: 2_500_000,
		paidAmountRub: 0,
		paidAmountKopecks: 0,
		remainingAmountRub: 25_000,
		remainingAmountKopecks: 2_500_000,
		funnelStage: "plan_negotiation",
		curatorId: "33333333-3333-4333-8333-333333333331",
		curatorFullName: "Смирнова Анна (Куратор)",
		assignedAt: "2026-08-18T10:00:00.000Z",
		stageUpdatedAt: "2026-08-18T10:00:00.000Z",
		daysInStage: 6, // Превышен норматив (5 дней)
		doctorId: "44444444-4444-4444-8444-444444444443",
		doctorFullName: "Васильева В.В. (Терапевт)",
		priorityScore: 70,
		attentionFlags: ["stagnant_plan", "pending_prepayment", "requires_followup_call"],
	},
	{
		patientId: "11111111-1111-4111-8111-111111111114",
		patientFullName: "Морозов Артем Павлович",
		patientPhone: "+7 (999) 444-55-66",
		treatmentPlanId: "22222222-2222-4222-8222-222222222224",
		treatmentPlanTitle: "Эндодонтическое перелечивание 36 зуба",
		planTier: "optimum",
		planTotalPriceRub: 45_000,
		planTotalPriceKopecks: 4_500_000,
		paidAmountRub: 0,
		paidAmountKopecks: 0,
		remainingAmountRub: 45_000,
		remainingAmountKopecks: 4_500_000,
		funnelStage: "consultation",
		curatorId: "33333333-3333-4333-8333-333333333331",
		curatorFullName: "Смирнова Анна (Куратор)",
		assignedAt: "2026-08-22T10:00:00.000Z",
		stageUpdatedAt: "2026-08-22T10:00:00.000Z",
		daysInStage: 1,
		doctorId: "44444444-4444-4444-8444-444444444443",
		doctorFullName: "Васильева В.В. (Терапевт)",
		priorityScore: 50,
		attentionFlags: [],
	},
];

describe("Curator Treatment Funnel & Commission Math Engine", () => {
	test("calculateCuratorCommission: exact kopeck precision with standard and tiered rates", () => {
		// 100 000 руб = 10 000 000 копеек при конверсии 65% (повышенная ставка 4.0%)
		const resTier4 = calculateCuratorCommission(10_000_000, 65.0);
		assert.strictEqual(resTier4.effectiveRatePercent, 4.0);
		assert.strictEqual(resTier4.commissionKopecks, 400_000);
		assert.strictEqual(resTier4.commissionRub, 4000);

		// 240 000 руб = 24 000 000 копеек при конверсии 80% (премиальная ставка 5.5%)
		const resTier55 = calculateCuratorCommission(24_000_000, 80.0);
		assert.strictEqual(resTier55.effectiveRatePercent, 5.5);
		assert.strictEqual(resTier55.commissionKopecks, 1_320_000);
		assert.strictEqual(resTier55.commissionRub, 13_200);

		// Кастомная фиксированная ставка 3.5%
		const resCustom = calculateCuratorCommission(50_000_00, 50.0, 3.5);
		assert.strictEqual(resCustom.effectiveRatePercent, 3.5);
		assert.strictEqual(resCustom.commissionKopecks, 175_000);
		assert.strictEqual(resCustom.commissionRub, 1750);
	});

	test("calculateCuratorMetrics: correct aggregation, conversion and stage breakdown", () => {
		const metrics = calculateCuratorMetrics(
			sampleCuratorQueue,
			"33333333-3333-4333-8333-333333333331",
			"Смирнова Анна (Куратор)",
		);

		assert.strictEqual(metrics.totalPlansCount, 4);
		assert.strictEqual(metrics.totalAssignedPatients, 4);
		// 240k + 180k + 25k + 45k = 490 000 руб
		assert.strictEqual(metrics.totalPlansSumRub, 490_000);
		assert.strictEqual(metrics.totalPlansSumKopecks, 49_000_000);

		// Выручка: 240k (completed) + 90k (treatment_start) = 330 000 руб
		assert.strictEqual(metrics.totalCollectedRevenueRub, 330_000);
		assert.strictEqual(metrics.totalCollectedRevenueKopecks, 33_000_000);

		// Конверсия: 2 плана (treatment_start + completed) из 4 = 50.0%
		assert.strictEqual(metrics.overallConversionPercent, 50.0);

		// Ставка при 50%: Стандартная ставка 3.0% -> 330 000 * 3.0% = 9 900 руб (990 000 коп)
		assert.strictEqual(metrics.effectiveCommissionRatePercent, 3.0);
		assert.strictEqual(metrics.commissionEarnedKopecks, 990_000);
		assert.strictEqual(metrics.commissionEarnedRub, 9900);

		assert.strictEqual(metrics.stagesBreakdown.length, 5);
		assert.strictEqual(metrics.stagesBreakdown[0]?.stage, "consultation");
		assert.strictEqual(metrics.stagesBreakdown[0]?.count, 1);
		assert.strictEqual(metrics.stagesBreakdown[1]?.stage, "plan_negotiation");
		assert.strictEqual(metrics.stagesBreakdown[1]?.count, 1);
		assert.strictEqual(metrics.stagesBreakdown[3]?.stage, "treatment_start");
		assert.strictEqual(metrics.stagesBreakdown[3]?.count, 1);
		assert.strictEqual(metrics.stagesBreakdown[4]?.stage, "completed");
		assert.strictEqual(metrics.stagesBreakdown[4]?.count, 1);
	});

	test("evaluatePatientUrgency: detects stagnant plans, high checks, and priority scoring", () => {
		// План на согласовании 7 дней без оплаты на 200 000 руб
		const urg1 = evaluatePatientUrgency(7, "plan_negotiation", 200_000, 0, false);
		assert.ok(urg1.priorityScore >= 75, "Priority score must be elevated");
		assert.ok(urg1.attentionFlags.includes("stagnant_plan"));
		assert.ok(urg1.attentionFlags.includes("high_value_plan"));
		assert.ok(urg1.attentionFlags.includes("pending_prepayment"));
		assert.ok(urg1.attentionFlags.includes("requires_followup_call"));

		// Завершенный план
		const urgCompleted = evaluatePatientUrgency(1, "completed", 50_000, 50_000);
		assert.strictEqual(urgCompleted.priorityScore, 10);
		assert.strictEqual(urgCompleted.attentionFlags.length, 0);
	});

	test("filterAndSortCuratorQueue: stage filters, sum ranges and search", () => {
		// 1. Фильтр по этапу
		const onlyNegotiation = filterAndSortCuratorQueue(sampleCuratorQueue, {
			stage: "plan_negotiation",
		});
		assert.strictEqual(onlyNegotiation.length, 1);
		assert.strictEqual(onlyNegotiation[0]?.patientFullName, "Ковалев Дмитрий Андреевич");

		// 2. Фильтр по чеку (high > 150k)
		const highValue = filterAndSortCuratorQueue(sampleCuratorQueue, {
			priceRange: "high",
		});
		assert.strictEqual(highValue.length, 2);

		// 3. Поиск по тексту
		const searchRes = filterAndSortCuratorQueue(sampleCuratorQueue, {
			searchQuery: "Виниры",
		});
		assert.strictEqual(searchRes.length, 1);
		assert.strictEqual(searchRes[0]?.patientFullName, "Сидорова Елена Сергеевна");

		// 4. Сортировка по приоритету (highest first)
		const sorted = filterAndSortCuratorQueue(sampleCuratorQueue, {
			sortBy: "priority",
		});
		assert.ok((sorted[0]?.priorityScore ?? 0) >= (sorted[1]?.priorityScore ?? 0));
	});

	test("advancePatientFunnelStage: properly recalculates balances and transitions stage", () => {
		const item = sampleCuratorQueue[2]!; // 25 000 руб, 0 оплачено, stage: plan_negotiation
		const advanced = advancePatientFunnelStage(item, "prepayment", 10_000);

		assert.strictEqual(advanced.funnelStage, "prepayment");
		assert.strictEqual(advanced.paidAmountRub, 10_000);
		assert.strictEqual(advanced.paidAmountKopecks, 1_000_000);
		assert.strictEqual(advanced.remainingAmountRub, 15_000);
		assert.strictEqual(advanced.remainingAmountKopecks, 1_500_000);
		assert.strictEqual(advanced.daysInStage, 0);
	});
});
