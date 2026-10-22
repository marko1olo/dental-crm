/**
 * curatorRolesAndSchema.test.ts — роли кураторов и валидация Zod-схемы.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	curatorPlanAssignmentPayloadSchema,
	type CuratorPlanAssignmentPayload,
} from "@dental/shared";
import {
	CURATOR_ALLOWED_STAFF_ROLES,
	CURATOR_ROLE_LABELS,
} from "../CuratorPlanAssignmentModal";

describe("Curator Autonomy — Роли персонала и Zod-схема", () => {
	test("Все 7 клинических специализаций врачей входят в CURATOR_ALLOWED_STAFF_ROLES", () => {
		const expectedDoctorRoles = ["doctor", "therapist", "surgeon", "orthopedist", "orthodontist", "periodontist", "pediatric"] as const;
		for (const role of expectedDoctorRoles) {
			assert.ok(CURATOR_ALLOWED_STAFF_ROLES.has(role));
		}
	});

	test("Административные роли сохранены, а немедицинские отсекаются", () => {
		for (const role of ["curator", "administrator", "manager", "admin", "owner"] as const) {
			assert.ok(CURATOR_ALLOWED_STAFF_ROLES.has(role));
		}
		for (const role of ["cleaner", "accountant", "courier", "intern_guest"]) {
			assert.strictEqual(CURATOR_ALLOWED_STAFF_ROLES.has(role), false);
		}
	});

	test("CURATOR_ROLE_LABELS предоставляет русскоязычные наименования для врачей", () => {
		assert.strictEqual(CURATOR_ROLE_LABELS.doctor, "Врач-стоматолог");
		assert.strictEqual(CURATOR_ROLE_LABELS.therapist, "Стоматолог-терапевт");
		assert.strictEqual(CURATOR_ROLE_LABELS.surgeon, "Стоматолог-хирург");
		assert.strictEqual(CURATOR_ROLE_LABELS.orthopedist, "Стоматолог-ортопед");
	});

	test("Фильтрация штата клиники включает активных врачей и кураторов", () => {
		const mockStaff = [
			{ id: "staff-1", name: "Барабаш С.В.", role: "surgeon", active: true },
			{ id: "staff-2", name: "Смирнова Е.А.", role: "therapist", active: true },
			{ id: "staff-3", name: "Иванов И.И.", role: "cleaner", active: true },
			{ id: "staff-4", name: "Сидорова О.П.", role: "doctor", active: false },
		];
		const filtered = mockStaff.filter((s) => s.active && CURATOR_ALLOWED_STAFF_ROLES.has(s.role));
		assert.strictEqual(filtered.length, 2);
		assert.deepStrictEqual(filtered.map((s) => s.id), ["staff-1", "staff-2"]);
	});

	test("Полезная нагрузка самокурации с curatorId: null валидируется схемой", () => {
		const payload: CuratorPlanAssignmentPayload = {
			patientId: "patient-48102",
			treatmentPlanId: "PLAN-D3B073",
			curatorId: null,
			curatorFullName: "Лечащий врач (без куратора)",
			initialStage: "consultation",
			customCommissionPercent: null,
			notes: "Самокурация в соло-кабинете",
			nextContactDate: null,
		};
		const result = curatorPlanAssignmentPayloadSchema.safeParse(payload);
		assert.strictEqual(result.success, true);
		if (result.success) {
			assert.strictEqual(result.data.curatorId, null);
			assert.strictEqual(result.data.curatorFullName, "Лечащий врач (без куратора)");
		}
	});

	test("curatorFullName по умолчанию заполняется 'Лечащий врач (без куратора)'", () => {
		const minimalPayload = { patientId: "pat-100", treatmentPlanId: "plan-200", curatorId: null };
		const result = curatorPlanAssignmentPayloadSchema.safeParse(minimalPayload);
		assert.strictEqual(result.success, true);
		if (result.success) {
			assert.strictEqual(result.data.curatorFullName, "Лечащий врач (без куратора)");
		}
	});
});
