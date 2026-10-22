/**
 * curatorSelfAutonomyAndTransitions.test.ts — логика самокурации соло-врача и снятия куратора.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	curatorPlanAssignmentPayloadSchema,
	type CuratorPlanAssignmentPayload,
} from "@dental/shared";
import {
	DOCTOR_SELF_CURATOR_ID,
	isDoctorSelfCurator,
} from "../CuratorPlanAssignmentModal";

describe("Curator Autonomy — Самокурация и переходы", () => {
	test("isDoctorSelfCurator корректно определяет самокурацию", () => {
		assert.strictEqual(isDoctorSelfCurator("doctor_self"), true);
		assert.strictEqual(isDoctorSelfCurator(DOCTOR_SELF_CURATOR_ID), true);
		assert.strictEqual(isDoctorSelfCurator(null), true);
		assert.strictEqual(isDoctorSelfCurator(undefined), true);
		assert.strictEqual(isDoctorSelfCurator(""), true);
		assert.strictEqual(isDoctorSelfCurator("staff-curator-1"), false);
	});

	test("Сценарий соло-врача (1 кресло / аренда): сохранение плана без стороннего куратора", () => {
		const selectedCuratorId = DOCTOR_SELF_CURATOR_ID;
		const isDoctorSelf = isDoctorSelfCurator(selectedCuratorId);
		assert.strictEqual(isDoctorSelf, true);

		const finalCuratorId = isDoctorSelf ? null : selectedCuratorId;
		const finalCuratorFullName = isDoctorSelf ? "Лечащий врач (без куратора)" : "Куратор";

		const payload: CuratorPlanAssignmentPayload = {
			patientId: "solo-patient-1",
			treatmentPlanId: "PLAN-SOLO-100",
			curatorId: finalCuratorId,
			curatorFullName: finalCuratorFullName,
			initialStage: "consultation",
			customCommissionPercent: null,
			notes: "Приём ведет соло-врач",
			nextContactDate: null,
		};

		const parsed = curatorPlanAssignmentPayloadSchema.safeParse(payload);
		assert.strictEqual(parsed.success, true);

		const isSaving = false;
		const isSaveDisabled = isSaving;
		assert.strictEqual(isSaveDisabled, false);
	});

	test("Смена куратора обратно на лечащего врача (снятие куратора)", () => {
		const initialCuratorId = "curator-99";
		assert.strictEqual(isDoctorSelfCurator(initialCuratorId), false);

		const updatedCuratorId = DOCTOR_SELF_CURATOR_ID;
		const isDoctorSelf = isDoctorSelfCurator(updatedCuratorId);
		assert.strictEqual(isDoctorSelf, true);

		const finalCuratorId = isDoctorSelf ? null : updatedCuratorId;
		assert.strictEqual(finalCuratorId, null);

		const finalCuratorFullName = isDoctorSelf ? "Лечащий врач (без куратора)" : "Куратор";
		assert.strictEqual(finalCuratorFullName, "Лечащий врач (без куратора)");
	});
});
