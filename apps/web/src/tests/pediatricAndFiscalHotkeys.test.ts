import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ALL_PRIMARY_TEETH,
	calculateEruptionTimelineByAge,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
} from "../components/odontogram/pediatricDentitionEngine";
import {
	calculateSplitPaymentAllocation,
	type SplitPaymentInput,
} from "../components/finance/order804nFiscalEngine";

describe("PediatricMixedDentitionModal — Ergonomics & Root Resorption Hotkeys", () => {
	test("Быстрые клавиши 0, 1, 2, 3, 4 однозначно сопоставлены с клиническими стадиями резорбции корней (0%, 25%, 50%, 75%, 100%)", () => {
		const resorptionKeyMap: Record<string, ResorptionStagePercent> = {
			"0": 0,
			"1": 25,
			"2": 50,
			"3": 75,
			"4": 100,
		};

		for (const [key, expectedStage] of Object.entries(resorptionKeyMap)) {
			const def = RESORPTION_STAGE_DEFINITIONS[expectedStage];
			assert.ok(def, `Определение для стадии ${expectedStage}% должно существовать`);
			assert.equal(def.stage, expectedStage);
			assert.ok(def.nameRu.length > 0);
			assert.ok(def.clinicalSignRu.length > 0);
		}
	});

	test("Навигация по молочным зубным дугам (55..65 верхняя, 85..75 нижняя)", () => {
		const UPPER_PRIMARY = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
		const LOWER_PRIMARY = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

		assert.equal(ALL_PRIMARY_TEETH.length, 20);
		assert.deepEqual(ALL_PRIMARY_TEETH, [...UPPER_PRIMARY, ...LOWER_PRIMARY]);

		// Проверка перехода между антагонистами (51 <-> 81, 55 <-> 85)
		const tooth51Idx = UPPER_PRIMARY.indexOf(51);
		assert.equal(LOWER_PRIMARY[tooth51Idx], 81);

		const tooth65Idx = UPPER_PRIMARY.indexOf(65);
		assert.equal(LOWER_PRIMARY[tooth65Idx], 75);

		// Проверка преемников
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[51], 11);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[61], 21);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[71], 31);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[81], 41);
	});

	test("Возрастная формула прикуса (Enter) вычисляет ожидаемые зубы", () => {
		const timeline = calculateEruptionTimelineByAge(7.5);
		assert.ok(timeline.expectedUpperArchTeeth.length > 0);
		assert.ok(timeline.expectedLowerArchTeeth.length > 0);
		assert.ok(timeline.stageNameRu.toLowerCase().includes("сменный"));
	});
});

describe("FiscalReceipt54FzModal — Rapid Payment Method Presets & Remainder Allocation", () => {
	test("Быстрые клавиши выбора 100% оплаты (1 — Карта, 2 — СБП, 3 — Наличные, 4 — Депозит)", () => {
		const totalKopecks = 2500000; // 25 000,00 ₽
		const totalRub = 25000;

		// 1. 100% Card
		const cardSplit: SplitPaymentInput = { cashRub: 0, cardRub: totalRub, sbpRub: 0, depositRub: 0 };
		const cardAlloc = calculateSplitPaymentAllocation(totalKopecks, cardSplit);
		assert.equal(cardAlloc.isFullyAllocated, true);
		assert.equal(cardAlloc.cardKopecks, totalKopecks);

		// 2. 100% SBP
		const sbpSplit: SplitPaymentInput = { cashRub: 0, cardRub: 0, sbpRub: totalRub, depositRub: 0 };
		const sbpAlloc = calculateSplitPaymentAllocation(totalKopecks, sbpSplit);
		assert.equal(sbpAlloc.isFullyAllocated, true);
		assert.equal(sbpAlloc.sbpKopecks, totalKopecks);

		// 3. 100% Cash
		const cashSplit: SplitPaymentInput = { cashRub: totalRub, cardRub: 0, sbpRub: 0, depositRub: 0 };
		const cashAlloc = calculateSplitPaymentAllocation(totalKopecks, cashSplit);
		assert.equal(cashAlloc.isFullyAllocated, true);
		assert.equal(cashAlloc.cashKopecks, totalKopecks);

		// 4. Deposit with partial remainder to card
		const patientDeposit = 10000; // Доступно 10 000 ₽
		const depSplit: SplitPaymentInput = {
			cashRub: 0,
			cardRub: totalRub - patientDeposit, // 15 000 ₽ на карту
			sbpRub: 0,
			depositRub: patientDeposit, // 10 000 ₽ с депозита
		};
		const depAlloc = calculateSplitPaymentAllocation(totalKopecks, depSplit);
		assert.equal(depAlloc.isFullyAllocated, true);
		assert.equal(depAlloc.depositKopecks, 1000000);
		assert.equal(depAlloc.cardKopecks, 1500000);
	});

	test("Моментальное распределение нераспределенного остатка", () => {
		const totalKopecks = 5000000; // 50 000,00 ₽
		const partialSplit: SplitPaymentInput = {
			cashRub: 15000,
			cardRub: 0,
			sbpRub: 0,
			depositRub: 0,
		};

		const initialAlloc = calculateSplitPaymentAllocation(totalKopecks, partialSplit);
		assert.equal(initialAlloc.isFullyAllocated, false);
		assert.equal(initialAlloc.remainingKopecks, 3500000); // 35 000 ₽ остаток

		// Распределяем остаток на карту
		const cardBase = typeof partialSplit.cardRub === "number" ? partialSplit.cardRub : 0;
		const completedSplit: SplitPaymentInput = {
			...partialSplit,
			cardRub: cardBase + Math.round(initialAlloc.remainingKopecks / 100),
		};

		const finalAlloc = calculateSplitPaymentAllocation(totalKopecks, completedSplit);
		assert.equal(finalAlloc.isFullyAllocated, true);
		assert.equal(finalAlloc.remainingKopecks, 0);
	});
});
