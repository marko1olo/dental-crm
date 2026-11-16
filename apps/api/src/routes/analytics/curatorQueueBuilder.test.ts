/**
 * curatorQueueBuilder.test.ts — Инвариант строгой изоляции оплат по planId (PLN-05)
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { buildCuratorQueueItem, type RawCuratorPlanRecord } from "./curatorQueueBuilder.js";
import type { CuratorStaffUser } from "./curatorTypes.js";

describe("PLN-05: Curator Queue strict plan payment scoping without cross-contamination", () => {
	const mockCurator: CuratorStaffUser = {
		id: "cur-1",
		fullName: "Тестовый куратор",
		role: "curator",
	};

	const doctorMap = new Map<string, string>([["doc-1", "Иванов И.И."]]);

	test("Новый план лечения не заражается старыми оплатами того же пациента", () => {
		const sharedPatientId = "pat-100";

		const oldPaidPlan: RawCuratorPlanRecord = {
			id: "plan-old-completed",
			name: "Старый завершенный план (2025)",
			status: "Completed",
			totalPriceRub: 100000,
			totalPrice: 100000,
			createdAt: new Date("2025-01-10"),
			patientId: sharedPatientId,
			doctorId: "doc-1",
			patientFullName: "Сидоров С.С.",
			patientPhone: "+79991234567",
			patientEmail: null,
			patientAdminProfile: null,
		};

		const newUnpaidPlan: RawCuratorPlanRecord = {
			id: "plan-new-consultation",
			name: "Новый план: Тотальная имплантация (2026)",
			status: "Draft",
			totalPriceRub: 350000,
			totalPrice: 350000,
			createdAt: new Date("2026-08-01"),
			patientId: sharedPatientId,
			doctorId: "doc-1",
			patientFullName: "Сидоров С.С.",
			patientPhone: "+79991234567",
			patientEmail: null,
			patientAdminProfile: null,
		};

		// Оплаты строго привязаны к plan.id (treatmentPlanId)
		const planPaymentMap = new Map<string, number>([
			["plan-old-completed", 100000],
			// Для нового плана оплат нет (0 ₽)
		]);

		const oldItem = buildCuratorQueueItem(oldPaidPlan, planPaymentMap, doctorMap, mockCurator);
		const newItem = buildCuratorQueueItem(newUnpaidPlan, planPaymentMap, doctorMap, mockCurator);

		// Старый план полностью оплачен
		assert.equal(oldItem.paidAmountRub, 100000);
		assert.equal(oldItem.remainingAmountRub, 0);

		// PLN-05: Новый план НЕ должен получить 100 000 ₽ от старого плана пациента!
		assert.equal(
			newItem.paidAmountRub,
			0,
			"PLN-05: Новый план лечения обязан иметь 0 ₽ оплат, запрещено заражение старыми платежами пациента",
		);
		assert.equal(
			newItem.remainingAmountRub,
			350000,
			"Остаток по новому плану должен составлять полную стоимость 350 000 ₽",
		);
		assert.notEqual(
			newItem.funnelStage,
			"prepayment",
			"Новый план без оплат не должен ложно перескакивать на этап предоплаты",
		);
	});

	test("DEF-ANALYTICS-05: Если куратор не назначен — возвращается null и 'Не назначен' без фейкового UUID", () => {
		const unassignedPlan: RawCuratorPlanRecord = {
			id: "plan-unassigned",
			name: "План без куратора",
			status: "Draft",
			totalPriceRub: 50000,
			totalPrice: 50000,
			createdAt: new Date("2026-08-10"),
			patientId: "pat-200",
			doctorId: null,
			patientFullName: "Петров П.П.",
			patientPhone: "+79997654321",
			patientEmail: null,
			patientAdminProfile: null,
		};

		const item = buildCuratorQueueItem(unassignedPlan, new Map(), doctorMap, null);
		assert.equal(item.curatorId, null, "Куратор должен быть null, когда не назначен");
		assert.equal(item.curatorFullName, "Не назначен", "Отображаемое имя должно быть 'Не назначен'");
		assert.notEqual(item.curatorId, "00000000-0000-0000-0000-000000000001", "Никаких фейковых хардкодных UUID");
	});
});
