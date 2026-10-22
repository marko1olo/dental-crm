import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { rublesToKopecks } from "@dental/shared";
import {
	allocatePatientDepositToStages,
	calculateStagePaymentTotals,
	createDefaultMilestoneStages,
	validateStageStateTransition,
} from "../stagePayment/stagePaymentEngine";

describe("stagePaymentEngine: Milestone Stages & Waterfall Allocation", () => {
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
			availableDepositKopecks: rublesToKopecks(30000),
			lockedEscrowKopecks: 0 as any,
			totalBalanceKopecks: rublesToKopecks(30000),
		};

		const result = allocatePatientDepositToStages(stages, depositWallet);
		assert.ok(result.allocatedLog.length > 0);
		assert.equal(result.updatedDeposit.lockedEscrowKopecks, 0);
		assert.ok(result.updatedStages[0]!.advancePaidKopecks > 0);
		assert.ok(result.updatedDeposit.availableDepositKopecks < depositWallet.availableDepositKopecks);
	});
});
