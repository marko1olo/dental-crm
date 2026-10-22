import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { rublesToKopecks } from "@dental/shared";
import {
	calculateTerminationRefund,
	closeStageWithCompletedAct,
	createDefaultMilestoneStages,
	exportStageScheduleToCsv,
	generate54FzStageFiscalReceipt,
} from "../stagePayment/stagePaymentEngine";

describe("stagePaymentEngine: Completed Acts, Termination Refund & 54-FZ", () => {
	test("closeStageWithCompletedAct переводит этап в статус закрытия и освобождает эскроу", () => {
		const stages = createDefaultMilestoneStages();
		const stage = stages[0]!;

		const actResult = closeStageWithCompletedAct(stage, "АКТ-001", "2026-08-22");
		assert.equal(actResult.updatedStage.actNumber, "АКТ-001");
		assert.equal(actResult.updatedStage.escrowLockedKopecks, 0);
		assert.ok(actResult.recognizedRevenueKopecks > 0);
	});

	test("calculateTerminationRefund удерживает фактически понесенные расходы клиники", () => {
		const stages = createDefaultMilestoneStages();
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
		assert.equal(refundCalc.actualClinicExpensesKopecks, rublesToKopecks(25000));
		assert.equal(refundCalc.clinicRetentionKopecks, rublesToKopecks(25000));
		assert.equal(refundCalc.refundableToPatientKopecks, rublesToKopecks(15000));
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
		assert.equal(receipt.items[0]?.fiscalTag1212, "10");
	});

	test("exportStageScheduleToCsv экспортирует валидный CSV с UTF-8 BOM", () => {
		const stages = createDefaultMilestoneStages();
		const csv = exportStageScheduleToCsv(stages, "План лечения", "Иванов И.И.");

		assert.ok(csv.startsWith("\uFEFF"), "CSV должен начинаться с UTF-8 BOM");
		assert.ok(csv.includes("ПЛАН ПОЭТАПНОЙ ОПЛАТЫ"));
		assert.ok(csv.includes("№ этапа"));
	});
});
