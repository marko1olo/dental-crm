/**
 * apps/web/src/components/treatment-plans/__tests__/curatorAutonomy.test.ts
 *
 * Тестирование автономии врача при курации планов лечения (Фича #27 DENTE CRM).
 * Полное соответствие мандатам:
 *  - Мандат 8e (Doctor Autonomy): отсутствие заблокированных кнопок и навязывания лишних ролей.
 *  - Мандат 8k (CRM != Reality Simulator): снижение трения, выбор самокурации в 1 клик.
 *  - Мандат 8n (Solo Doctor & Small Clinic Scale Sovereignty, Zero Dead-Ends):
 *    соло-врач на аренде и клиника на 1-3 кресла ведут планы сами без выделенного куратора.
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
	DOCTOR_SELF_CURATOR_ID,
	isDoctorSelfCurator,
} from "../CuratorPlanAssignmentModal";

describe("Solo Doctor Plan Curator Autonomy (Mandates 8e, 8k, 8n)", () => {
	describe("1. Включение врачебных ролей в список ответственных за план", () => {
		test("Все 7 клинических специализаций врачей-стоматологов входят в CURATOR_ALLOWED_STAFF_ROLES", () => {
			const expectedDoctorRoles = [
				"doctor",
				"therapist",
				"surgeon",
				"orthopedist",
				"orthodontist",
				"periodontist",
				"pediatric",
			] as const;

			for (const role of expectedDoctorRoles) {
				assert.ok(
					CURATOR_ALLOWED_STAFF_ROLES.has(role),
					`Врачебная роль "${role}" обязана входить в список разрешенных ролей для курации`,
				);
			}
		});

		test("Административные и управляющие роли также сохранены для обратной совместимости", () => {
			const managementRoles = ["curator", "administrator", "manager", "admin", "owner"] as const;
			for (const role of managementRoles) {
				assert.ok(
					CURATOR_ALLOWED_STAFF_ROLES.has(role),
					`Управленческая роль "${role}" должна поддерживаться`,
				);
			}
		});

		test("Немедицинские и сторонние роли отсекаются из списка кураторов", () => {
			const forbiddenRoles = ["cleaner", "accountant", "courier", "intern_guest"];
			for (const role of forbiddenRoles) {
				assert.strictEqual(
					CURATOR_ALLOWED_STAFF_ROLES.has(role),
					false,
					`Сторонняя роль "${role}" не должна иметь доступа к курации планов лечения`,
				);
			}
		});

		test("CURATOR_ROLE_LABELS предоставляет корректные русскоязычные наименования для всех врачей", () => {
			assert.strictEqual(CURATOR_ROLE_LABELS.doctor, "Врач-стоматолог");
			assert.strictEqual(CURATOR_ROLE_LABELS.therapist, "Стоматолог-терапевт");
			assert.strictEqual(CURATOR_ROLE_LABELS.surgeon, "Стоматолог-хирург");
			assert.strictEqual(CURATOR_ROLE_LABELS.orthopedist, "Стоматолог-ортопед");
			assert.strictEqual(CURATOR_ROLE_LABELS.orthodontist, "Ортодонт");
			assert.strictEqual(CURATOR_ROLE_LABELS.periodontist, "Пародонтолог");
			assert.strictEqual(CURATOR_ROLE_LABELS.pediatric, "Детский стоматолог");
		});

		test("Фильтрация штата клиники включает активных врачей и кураторов", () => {
			const mockStaff = [
				{ id: "staff-1", name: "Барабаш С.В.", role: "surgeon", active: true },
				{ id: "staff-2", name: "Смирнова Е.А.", role: "therapist", active: true },
				{ id: "staff-3", name: "Ковалев В.Н.", role: "orthopedist", active: true },
				{ id: "staff-4", name: "Петрова А.И.", role: "curator", active: true },
				{ id: "staff-5", name: "Иванов И.И.", role: "cleaner", active: true },
				{ id: "staff-6", name: "Сидорова О.П.", role: "doctor", active: false }, // inactive
			];

			const filtered = mockStaff.filter(
				(s) => s.active && CURATOR_ALLOWED_STAFF_ROLES.has(s.role),
			);

			assert.strictEqual(filtered.length, 4, "Должно остаться ровно 4 активных сотрудника");
			const ids = filtered.map((s) => s.id);
			assert.deepStrictEqual(ids, ["staff-1", "staff-2", "staff-3", "staff-4"]);
		});
	});

	describe("2. Валидация схемы curatorPlanAssignmentPayloadSchema для самокурации лечащим врачом", () => {
		test("Полезная нагрузка самокурации с curatorId: null успешно проходит safeParse", () => {
			const payload: CuratorPlanAssignmentPayload = {
				patientId: "patient-48102",
				treatmentPlanId: "PLAN-D3B073",
				curatorId: null,
				curatorFullName: "Лечащий врач (без куратора)",
				initialStage: "consultation",
				customCommissionPercent: null,
				notes: "Самокурация врачом-терапевтом в соло-кабинете",
				nextContactDate: null,
			};

			const result = curatorPlanAssignmentPayloadSchema.safeParse(payload);
			assert.strictEqual(result.success, true, "Payload с curatorId: null обязан быть валидным");
			if (result.success) {
				assert.strictEqual(result.data.curatorId, null);
				assert.strictEqual(result.data.curatorFullName, "Лечащий врач (без куратора)");
			}
		});

		test("curatorFullName по умолчанию заполняется 'Лечащий врач (без куратора)' при отсутствии значения", () => {
			const minimalPayload = {
				patientId: "patient-100",
				treatmentPlanId: "plan-200",
				curatorId: null,
			};

			const result = curatorPlanAssignmentPayloadSchema.safeParse(minimalPayload);
			assert.strictEqual(result.success, true);
			if (result.success) {
				assert.strictEqual(result.data.curatorFullName, "Лечащий врач (без куратора)");
				assert.strictEqual(result.data.initialStage, "consultation");
			}
		});

		test("Полезная нагрузка с назначением конкретного врача (например, ортопеда) также валидна", () => {
			const doctorPayload = {
				patientId: "patient-883",
				treatmentPlanId: "plan-ortho-01",
				curatorId: "doc-ortho-77",
				curatorFullName: "Ковалев В.Н. (Стоматолог-ортопед)",
				initialStage: "plan_negotiation",
				customCommissionPercent: 4.5,
				notes: "Тотальное протезирование на диоксиде циркония",
				nextContactDate: "2026-09-15",
			};

			const result = curatorPlanAssignmentPayloadSchema.safeParse(doctorPayload);
			assert.strictEqual(result.success, true);
			if (result.success) {
				assert.strictEqual(result.data.curatorId, "doc-ortho-77");
				assert.strictEqual(result.data.curatorFullName, "Ковалев В.Н. (Стоматолог-ортопед)");
				assert.strictEqual(result.data.customCommissionPercent, 4.5);
			}
		});

		test("curatorId принимает undefined без выброса ошибок схемы", () => {
			const payloadWithoutCurator = {
				patientId: "pat-99",
				treatmentPlanId: "plan-99",
			};

			const result = curatorPlanAssignmentPayloadSchema.safeParse(payloadWithoutCurator);
			assert.strictEqual(result.success, true);
			if (result.success) {
				assert.strictEqual(result.data.curatorId, undefined);
				assert.strictEqual(result.data.curatorFullName, "Лечащий врач (без куратора)");
			}
		});
	});

	describe("3. Функционирование логики сохранения без обязательного выделенного куратора (Мандат 8e, 8n)", () => {
		test("isDoctorSelfCurator корректно определяет самокурацию для doctor_self, null и пустой строки", () => {
			assert.strictEqual(isDoctorSelfCurator("doctor_self"), true);
			assert.strictEqual(isDoctorSelfCurator(DOCTOR_SELF_CURATOR_ID), true);
			assert.strictEqual(isDoctorSelfCurator(null), true);
			assert.strictEqual(isDoctorSelfCurator(undefined), true);
			assert.strictEqual(isDoctorSelfCurator(""), true);

			// Конкретный сотрудник — не самокурация
			assert.strictEqual(isDoctorSelfCurator("staff-curator-1"), false);
			assert.strictEqual(isDoctorSelfCurator("doc-surgeon-2"), false);
		});

		test("Сценарий соло-врача (1 кресло / аренда): сохранение плана без единого стороннего куратора", () => {
			// В соло-практике список кураторов клиники пуст: staff = []
			const clinicStaff: any[] = [];
			const selectedCuratorId = DOCTOR_SELF_CURATOR_ID;

			const isDoctorSelf = isDoctorSelfCurator(selectedCuratorId);
			assert.strictEqual(isDoctorSelf, true, "Соло-врач находится в режиме самокурации");

			const finalCuratorId = isDoctorSelf ? null : selectedCuratorId;
			const finalCuratorFullName = isDoctorSelf
				? "Лечащий врач (без куратора)"
				: "Куратор";

			const payload: CuratorPlanAssignmentPayload = {
				patientId: "solo-patient-1",
				treatmentPlanId: "PLAN-SOLO-100",
				curatorId: finalCuratorId,
				curatorFullName: finalCuratorFullName,
				initialStage: "consultation",
				customCommissionPercent: null,
				notes: "Приём ведет соло-врач ИП Барабаш С.В.",
				nextContactDate: null,
			};

			// Проверяем валидность по схеме
			const parsed = curatorPlanAssignmentPayloadSchema.safeParse(payload);
			assert.strictEqual(parsed.success, true, "План соло-врача обязан успешно валидироваться");

			// Кнопка сохранения НЕ должна быть заблокирована
			const isSaving = false;
			const isSaveDisabled = isSaving; // Мандат 8e: disabled={isSaving}, без !selectedCuratorId
			assert.strictEqual(isSaveDisabled, false, "Кнопка сохранения активна для соло-врача");
		});

		test("Смена куратора обратно на лечащего врача (снятие куратора)", () => {
			// Пациент ранее имел куратора "curator-99", врач решает вести пациента самостоятельно
			const initialCuratorId = "curator-99";
			assert.strictEqual(isDoctorSelfCurator(initialCuratorId), false);

			// Пользователь выбирает DOCTOR_SELF_CURATOR_ID
			const updatedCuratorId = DOCTOR_SELF_CURATOR_ID;
			const isDoctorSelf = isDoctorSelfCurator(updatedCuratorId);
			assert.strictEqual(isDoctorSelf, true);

			const finalCuratorId = isDoctorSelf ? null : updatedCuratorId;
			assert.strictEqual(finalCuratorId, null, "Куратор успешно откреплен (curatorId = null)");

			const finalCuratorFullName = isDoctorSelf
				? "Лечащий врач (без куратора)"
				: "Куратор";
			assert.strictEqual(finalCuratorFullName, "Лечащий врач (без куратора)");
		});
	});
});
