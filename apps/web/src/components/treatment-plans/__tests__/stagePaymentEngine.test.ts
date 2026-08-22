/**
 * stagePaymentEngine.test.ts — тестирование эскроу-депозитов, поэтапного распределения платежей,
 * закрытия актом, расчета возврата при расторжении (ст. 32 ЗоЗПП) и чеков 54-ФЗ.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { rublesToKopecks } from "@dental/shared";
import {
	allocatePatientDepositToStages,
	calculateStagePaymentTotals,
	calculateTerminationRefund,
	closeStageWithCompletedAct,
	createDefaultMilestoneStages,
	exportStageScheduleToCsv,
	generate54FzStageFiscalReceipt,
	validateStageStateTransition,
} from "../stagePayment/stagePaymentEngine";

describe("stagePaymentEngine: Kopeck-exact Escrow, Waterfall Allocation & 54-FZ", () => {
	test("createDefaultMilestoneStages создает 3 стандартных клинических этапа", () => {
		const stages = createDefaultMilestoneStages();
		assert.equal(stages.length, 3);
		assert.equal(stages[0]?.stageNumber, 1);
		assert.equal(stages[1]?.stageNumber, 2);
		assert.equal(stages[2]?.stageNumber, 3);

		for (const stage of stages) {
			assert.ok(stage.totalKopecks > 0);
			assert.ok(stage.advanceRequiredKopecks > 0);
			assert.equal(stage.status, "draft");
		}
	});

	test("calculateStagePaymentTotals точно считает сводные суммы и прогресс", () => {
		const stages = createDefaultMilestoneStages();
		const totals = calculateStagePaymentTotals(stages);

		assert.ok(totals.grandTotalKopecks > 0);
		assert.equal(totals.totalPaidKopecks, 0);
		assert.equal(totals.remainingDueKopecks, totals.grandTotalKopecks);
		assert.equal(totals.progressPercent, 0);
	});

	test("validateStageStateTransition проверяет допустимость жизненного цикла статусов", () => {
		assert.equal(validateStageStateTransition("draft", "advance_paid").allowed, true);
		assert.equal(validateStageStateTransition("advance_paid", "in_progress").allowed, true);
		assert.equal(validateStageStateTransition("in_progress", "act_completed").allowed, true);
		assert.equal(validateStageStateTransition("act_completed", "fully_paid").allowed, true);
	});

	test("allocatePatientDepositToStages распределяет свободный депозит по этапам в порядке приоритета", () => {
		const stages = createDefaultMilestoneStages();
		const depositWallet = {
			patientId: "PAT-104",
			availableDepositKopecks: rublesToKopecks(30000), // 30 000 ₽
			lockedEscrowKopecks: 0 as any,
			totalBalanceKopecks: rublesToKopecks(30000),
		};

		const result = allocatePatientDepositToStages(stages, depositWallet);
		assert.ok(result.allocatedLog.length > 0);
		assert.ok(result.updatedDeposit.lockedEscrowKopecks > 0);
		assert.ok(result.updatedStages[0]!.advancePaidKopecks > 0);
	});

	test("closeStageWithCompletedAct переводит этап в статус закрытия и освобождает эскроу", () => {
		const stages = createDefaultMilestoneStages();
		const stage = stages[0]!;

		const actResult = closeStageWithCompletedAct(stage, "АКТ-001", "2026-08-22");
		assert.equal(actResult.updatedStage.actNumber, "АКТ-001");
		assert.equal(actResult.updatedStage.escrowLockedKopecks, 0);
		assert.ok(actResult.recognizedRevenueKopecks > 0);
	});

	test("calculateTerminationRefund удерживает фактически понесенные расходы клиники (ст. 32 ЗоЗПП)", () => {
		const stages = createDefaultMilestoneStages();
		// Имитируем оплаченный аванс по хирургии
		const modifiedStages = stages.map((s, idx) =>
			idx === 1
				? {
						...s,
						status: "in_progress" as const,
						advancePaidKopecks: rublesToKopecks(40000),
						directExpensesKopecks: {
							labKopecks: rublesToKopecks(15000),
							materialsKopecks: rublesToKopecks(10000),
							otherKopecks: rublesToKopecks(0),
						},
					}
				: s,
		);

		const refundCalc = calculateTerminationRefund(modifiedStages);
		assert.equal(refundCalc.totalPaidByPatientKopecks, rublesToKopecks(40000));
		assert.equal(refundCalc.actualClinicExpensesKopecks, rublesToKopecks(25000)); // 15k lab + 10k mat
		assert.equal(refundCalc.clinicRetentionKopecks, rublesToKopecks(25000));
		assert.equal(refundCalc.refundableToPatientKopecks, rublesToKopecks(15000)); // 40k - 25k = 15k
		assert.ok(refundCalc.legalRationaleRu.includes("ст. 32 Закона РФ"));
	});

	test("generate54FzStageFiscalReceipt формирует чек с фискальными тегами 1214, 1212 и QR-строкой", () => {
		const stages = createDefaultMilestoneStages();
		const receipt = generate54FzStageFiscalReceipt(
			stages[0]!,
			"advance",
			"BANK_CARD",
			"7701234567",
			"Иванов Иван",
			"Клиника ДЕНТЕ",
		);

		assert.ok(receipt.receiptId.startsWith("CHK-"));
		assert.ok(receipt.qrPayload.includes("fn="));
		assert.ok(receipt.qrPayload.includes("fp="));
		assert.equal(receipt.paymentMethod, "BANK_CARD");
		assert.equal(receipt.items[0]?.fiscalTag1212, "10"); // Платеж / Аванс
	});

	test("exportStageScheduleToCsv экспортирует валидный CSV с UTF-8 BOM", () => {
		const stages = createDefaultMilestoneStages();
		const csv = exportStageScheduleToCsv(stages, "План лечения", "Иванов И.И.");

		assert.ok(csv.startsWith("\uFEFF"), "CSV должен начинаться с UTF-8 BOM");
		assert.ok(csv.includes("ПЛАН ПОЭТАПНОЙ ОПЛАТЫ"));
		assert.ok(csv.includes("№ этапа"));
	});
});
