/**
 * DentalLabOrderService.test.ts — Модульные тесты для сервиса ЗТЛ,
 * трекинга этапов ортопедических конструкций, контроля дедлайнов
 * и расчета разделения расходов между клиникой и врачом.
 *
 * Feature #74: Лабораторные заказ-наряды зуботехнической лаборатории (ЗТЛ),
 * трекинг этапов и разделение расходов.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Decimal } from "decimal.js";
import {
	DENTAL_LAB_ORDER_STATUSES,
	DENTAL_LAB_STATUS_LABELS,
	DENTAL_LAB_STATUS_TRANSITIONS,
	DentalLabOrderError,
	type DentalLabOrderDeadlineInfo,
	type DentalLabOrderRecord,
	type DentalLabOrderStatus,
	DentalLabOrderService,
} from "./DentalLabOrderService.js";

describe("DentalLabOrderService — Dental Laboratory (ЗТЛ) & CAD/CAM Engine", () => {
	// ─── 1. СТАТУСЫ И МАШИНА СОСТОЯНИЙ (STATE MACHINE) ─────────────────────────

	describe("1. Statuses & Lifecycle Transitions", () => {
		it("contains all 7 mandated statuses with Russian descriptions", () => {
			const expectedStatuses: DentalLabOrderStatus[] = [
				"draft",
				"sent_to_lab",
				"in_progress",
				"fitting_received",
				"ready_for_installation",
				"installed_accepted",
				"rework_requested",
			];

			assert.equal(DENTAL_LAB_ORDER_STATUSES.length, 7);
			for (const status of expectedStatuses) {
				assert.ok(DENTAL_LAB_ORDER_STATUSES.includes(status), `Missing status: ${status}`);
				assert.ok(DENTAL_LAB_STATUS_LABELS[status], `Missing label for status: ${status}`);
				assert.ok(typeof DENTAL_LAB_STATUS_LABELS[status] === "string");
			}
		});

		it("allows valid sequential transitions from draft to installed_accepted", () => {
			// draft -> sent_to_lab
			assert.equal(DentalLabOrderService.canTransition("draft", "sent_to_lab"), true);
			assert.doesNotThrow(() =>
				DentalLabOrderService.validateStatusTransition("draft", "sent_to_lab"),
			);

			// sent_to_lab -> in_progress
			assert.equal(DentalLabOrderService.canTransition("sent_to_lab", "in_progress"), true);
			assert.doesNotThrow(() =>
				DentalLabOrderService.validateStatusTransition("sent_to_lab", "in_progress"),
			);

			// in_progress -> fitting_received
			assert.equal(DentalLabOrderService.canTransition("in_progress", "fitting_received"), true);
			assert.doesNotThrow(() =>
				DentalLabOrderService.validateStatusTransition("in_progress", "fitting_received"),
			);

			// fitting_received -> ready_for_installation
			assert.equal(
				DentalLabOrderService.canTransition("fitting_received", "ready_for_installation"),
				true,
			);
			assert.doesNotThrow(() =>
				DentalLabOrderService.validateStatusTransition("fitting_received", "ready_for_installation"),
			);

			// ready_for_installation -> installed_accepted
			assert.equal(
				DentalLabOrderService.canTransition("ready_for_installation", "installed_accepted"),
				true,
			);
			assert.doesNotThrow(() =>
				DentalLabOrderService.validateStatusTransition(
					"ready_for_installation",
					"installed_accepted",
				),
			);
		});

		it("allows direct transition from in_progress to ready_for_installation (without intermediate fitting)", () => {
			assert.equal(
				DentalLabOrderService.canTransition("in_progress", "ready_for_installation"),
				true,
			);
			assert.doesNotThrow(() =>
				DentalLabOrderService.validateStatusTransition("in_progress", "ready_for_installation"),
			);
		});

		it("supports rework/remake workflow (rework_requested cycle)", () => {
			// in_progress -> rework_requested
			assert.equal(DentalLabOrderService.canTransition("in_progress", "rework_requested"), true);

			// fitting_received -> rework_requested
			assert.equal(DentalLabOrderService.canTransition("fitting_received", "rework_requested"), true);

			// ready_for_installation -> rework_requested
			assert.equal(
				DentalLabOrderService.canTransition("ready_for_installation", "rework_requested"),
				true,
			);

			// rework_requested -> sent_to_lab or in_progress
			assert.equal(DentalLabOrderService.canTransition("rework_requested", "sent_to_lab"), true);
			assert.equal(DentalLabOrderService.canTransition("rework_requested", "in_progress"), true);
		});

		it("strictly prohibits accepting an order directly from draft (cannot accept without sending to lab)", () => {
			assert.equal(DentalLabOrderService.canTransition("draft", "installed_accepted"), false);

			assert.throws(
				() => DentalLabOrderService.validateStatusTransition("draft", "installed_accepted"),
				(err: unknown) => {
					assert.ok(err instanceof DentalLabOrderError);
					assert.equal(err.code, "InvalidStatusTransition");
					assert.ok(err.message.includes("без предварительной отправки в лабораторию"));
					return true;
				},
			);
		});

		it("strictly prohibits illegal lifecycle transitions", () => {
			// draft cannot jump directly to ready_for_installation or fitting_received
			assert.equal(DentalLabOrderService.canTransition("draft", "ready_for_installation"), false);
			assert.equal(DentalLabOrderService.canTransition("draft", "fitting_received"), false);

			// sent_to_lab cannot jump to installed_accepted
			assert.equal(DentalLabOrderService.canTransition("sent_to_lab", "installed_accepted"), false);

			// completed order (installed_accepted) is terminal and cannot transition anywhere
			assert.equal(
				DentalLabOrderService.canTransition("installed_accepted", "draft"),
				false,
			);
			assert.equal(
				DentalLabOrderService.canTransition("installed_accepted", "sent_to_lab"),
				false,
			);
			assert.throws(
				() => DentalLabOrderService.validateStatusTransition("installed_accepted", "draft"),
				(err: unknown) => err instanceof DentalLabOrderError && err.code === "OrderAlreadyCompleted",
			);
		});

		it("executes transitionOrderStatus and logs audit history correctly", () => {
			const initialOrder: DentalLabOrderRecord = {
				id: "ord-12345",
				organizationId: "org-1",
				patientId: "pat-1",
				patientFullName: "Иванов Иван Иванович",
				doctorId: "doc-1",
				doctorName: "Д-р Ортопедов",
				laboratoryName: "CAD/CAM Art Dental Lab",
				orderNumber: "ZTL-2026-0042",
				toothFdi: "16",
				restorationType: "crown_monolithic",
				material: "zirconia_multilayer_gradient",
				colorVita: "A2",
				status: "draft",
				labCostRub: 8500,
				clinicSharePct: 50,
				doctorSharePct: 50,
				history: [],
				createdAt: new Date("2026-08-01T10:00:00Z"),
				updatedAt: new Date("2026-08-01T10:00:00Z"),
			};

			const t1 = new Date("2026-08-01T12:00:00Z");
			const orderSent = DentalLabOrderService.transitionOrderStatus(
				initialOrder,
				"sent_to_lab",
				{
					actorUserId: "user-doctor-1",
					actorRole: "doctor",
					notes: "Скан верхней и нижней челюсти прикреплен",
					timestamp: t1,
				},
			);

			assert.equal(orderSent.status, "sent_to_lab");
			assert.equal(orderSent.history.length, 1);
			assert.equal(orderSent.history[0]?.fromStatus, "draft");
			assert.equal(orderSent.history[0]?.toStatus, "sent_to_lab");
			assert.equal(orderSent.history[0]?.actorRole, "doctor");
			assert.equal(orderSent.history[0]?.notes, "Скан верхней и нижней челюсти прикреплен");

			const t2 = new Date("2026-08-02T09:00:00Z");
			const orderInProgress = DentalLabOrderService.transitionOrderStatus(
				orderSent,
				"in_progress",
				{
					actorRole: "technician",
					notes: "3D-моделирование в Exocad начато",
					timestamp: t2,
				},
			);

			assert.equal(orderInProgress.status, "in_progress");
			assert.equal(orderInProgress.history.length, 2);
		});
	});

	// ─── 2. РАСЧЕТ РАЗДЕЛЕНИЯ СЕБЕСТОИМОСТИ ЗТЛ (computeLabExpenseSplit) ────────

	describe("2. Lab Expense Split Calculation (computeLabExpenseSplit)", () => {
		it("calculates exact 50% / 50% split on 10 000.00 rubles", () => {
			const split = DentalLabOrderService.computeLabExpenseSplit(10000, 50, 50);

			assert.equal(split.labCostRub, 10000);
			assert.equal(split.clinicSharePct, 50);
			assert.equal(split.doctorSharePct, 50);
			assert.equal(split.clinicAmountRub, 5000);
			assert.equal(split.doctorAmountRub, 5000);
			assert.equal(split.clinicAmountKopecks, 500000);
			assert.equal(split.doctorAmountKopecks, 500000);
			assert.equal(split.totalKopecks, 1000000);
			assert.equal(split.isBalanced, true);
		});

		it("calculates uneven 70% / 30% split on 15 250.75 rubles", () => {
			const split = DentalLabOrderService.computeLabExpenseSplit(15250.75, 70, 30);

			// 15250.75 * 70% = 10675.525 -> 10675.53 (1067553 коп)
			// 15250.75 - 10675.53 = 4575.22 (457522 коп)
			assert.equal(split.labCostRub, 15250.75);
			assert.equal(split.clinicAmountRub, 10675.53);
			assert.equal(split.doctorAmountRub, 4575.22);
			assert.equal(split.clinicAmountKopecks + split.doctorAmountKopecks, 1525075);
			assert.equal(split.isBalanced, true);
		});

		it("prevents 1-kopeck imbalance (penny drift) on odd numbers like 100.01 rub 50/50", () => {
			const split = DentalLabOrderService.computeLabExpenseSplit(100.01, 50, 50);

			// 100.01 rub = 10001 kopecks
			// Clinic 50% = round(5000.5) = 5001 kopecks (50.01 rub)
			// Doctor remaining = 10001 - 5001 = 5000 kopecks (50.00 rub)
			assert.equal(split.clinicAmountRub, 50.01);
			assert.equal(split.doctorAmountRub, 50.00);
			assert.equal(DentalLabOrderService.roundRub(split.clinicAmountRub + split.doctorAmountRub), 100.01);
			assert.equal(split.clinicAmountKopecks + split.doctorAmountKopecks, 10001);
			assert.equal(split.isBalanced, true);
		});

		it("handles 100% clinic / 0% doctor split", () => {
			const split = DentalLabOrderService.computeLabExpenseSplit(7500.5, 100, 0);

			assert.equal(split.clinicAmountRub, 7500.5);
			assert.equal(split.doctorAmountRub, 0);
			assert.equal(split.isBalanced, true);
		});

		it("handles 0% clinic / 100% doctor split", () => {
			const split = DentalLabOrderService.computeLabExpenseSplit(12000, 0, 100);

			assert.equal(split.clinicAmountRub, 0);
			assert.equal(split.doctorAmountRub, 12000);
			assert.equal(split.isBalanced, true);
		});

		it("handles zero cost order (0.00 rub)", () => {
			const split = DentalLabOrderService.computeLabExpenseSplit(0, 60, 40);

			assert.equal(split.labCostRub, 0);
			assert.equal(split.clinicAmountRub, 0);
			assert.equal(split.doctorAmountRub, 0);
			assert.equal(split.isBalanced, true);
		});

		it("accepts Decimal and string inputs seamlessly", () => {
			const splitFromStr = DentalLabOrderService.computeLabExpenseSplit("8400.60", 50, 50);
			assert.equal(splitFromStr.clinicAmountRub, 4200.3);
			assert.equal(splitFromStr.doctorAmountRub, 4200.3);

			const splitFromDec = DentalLabOrderService.computeLabExpenseSplit(new Decimal(8400.6), 50, 50);
			assert.equal(splitFromDec.clinicAmountRub, 4200.3);
		});

		it("rejects percentage split that does not sum to 100%", () => {
			assert.throws(
				() => DentalLabOrderService.computeLabExpenseSplit(5000, 50, 40),
				(err: unknown) => {
					assert.ok(err instanceof DentalLabOrderError);
					assert.equal(err.code, "InvalidPercentageSplit");
					assert.ok(err.message.includes("строго равна 100%"));
					return true;
				},
			);

			assert.throws(
				() => DentalLabOrderService.computeLabExpenseSplit(5000, 60, 50),
				(err: unknown) => err instanceof DentalLabOrderError && err.code === "InvalidPercentageSplit",
			);
		});

		it("rejects negative amounts or negative percentages", () => {
			assert.throws(
				() => DentalLabOrderService.computeLabExpenseSplit(-500, 50, 50),
				(err: unknown) => err instanceof DentalLabOrderError && err.code === "InvalidExpenseAmount",
			);

			assert.throws(
				() => DentalLabOrderService.computeLabExpenseSplit(5000, -10, 110),
				(err: unknown) => err instanceof DentalLabOrderError,
			);
		});
	});

	// ─── 3. РАСЧЕТ НАЧИСЛЕНИЯ ЗАРПЛАТЫ ВРАЧА (Payroll Deduction) ───────────────

	describe("3. Doctor Payroll Deduction with Lab Expenses", () => {
		it("calculates correct doctor net payout after lab deduction", () => {
			// Врач сдал металлокерамическую или циркониевую коронку на 35 000 руб.
			// Процент врача: 25% (гонорар = 8 750 руб.)
			// Себестоимость ЗТЛ: 6 000 руб.
			// Доля удержания ЗТЛ с врача: 50% (удержание = 3 000 руб.)
			// Чистый гонорар: 8 750 - 3 000 = 5 750 руб.
			const res = DentalLabOrderService.calculateDoctorPayrollDeduction(35000, 25, 6000, 50);

			assert.equal(res.grossRevenueRub, 35000);
			assert.equal(res.doctorCommissionPct, 25);
			assert.equal(res.grossDoctorFeeRub, 8750);
			assert.equal(res.labCostRub, 6000);
			assert.equal(res.doctorLabSharePct, 50);
			assert.equal(res.labDeductionRub, 3000);
			assert.equal(res.netDoctorPayoutRub, 5750);
		});

		it("protects against negative payroll payout when lab costs exceed commission", () => {
			// Выручка 10 000 руб., комиссия 10% (1 000 руб.), ЗТЛ 5 000 руб. при 50% удержании (2 500 руб.)
			// 1 000 - 2 500 = -1 500 -> ограничивается 0
			const res = DentalLabOrderService.calculateDoctorPayrollDeduction(10000, 10, 5000, 50);

			assert.equal(res.grossDoctorFeeRub, 1000);
			assert.equal(res.labDeductionRub, 2500);
			assert.equal(res.netDoctorPayoutRub, 0);
		});
	});

	// ─── 4. КОНТРОЛЬ ДЕДЛАЙНОВ И ПРЕДУПРЕЖДЕНИЯ (Deadlines Control) ──────────────

	describe("4. Deadline Evaluation & Alerting", () => {
		const refDate = new Date("2026-08-16T12:00:00.000Z");

		it("evaluates order on track when deadlines are comfortably in future", () => {
			const order: DentalLabOrderDeadlineInfo = {
				id: "ord-1",
				patientId: "p-1",
				status: "in_progress",
				createdAt: "2026-08-10T10:00:00.000Z",
				fittingDate: "2026-08-25T14:00:00.000Z", // +9 days
				deliveryDate: "2026-08-30T16:00:00.000Z", // +14 days
			};

			const assessment = DentalLabOrderService.evaluateDeadlines(order, refDate, 3);

			assert.equal(assessment.urgencyLevel, "normal");
			assert.equal(assessment.isFittingApproaching, false);
			assert.equal(assessment.isFittingOverdue, false);
			assert.equal(assessment.isDeliveryApproaching, false);
			assert.equal(assessment.isDeliveryOverdue, false);
			assert.equal(assessment.requiresImmediateAction, false);
			assert.equal(assessment.warningMessages.length, 0);
			assert.ok(assessment.daysUntilFitting! > 8);
		});

		it("detects approaching fitting deadline (< 3 days)", () => {
			const order: DentalLabOrderDeadlineInfo = {
				id: "ord-2",
				patientId: "p-2",
				status: "in_progress",
				createdAt: "2026-08-10T10:00:00.000Z",
				fittingDate: "2026-08-18T12:00:00.000Z", // +2 days
				deliveryDate: "2026-08-25T12:00:00.000Z",
			};

			const assessment = DentalLabOrderService.evaluateDeadlines(order, refDate, 3);

			assert.equal(assessment.urgencyLevel, "urgent");
			assert.equal(assessment.isFittingApproaching, true);
			assert.equal(assessment.isFittingOverdue, false);
			assert.ok(assessment.warningMessages.some((m) => m.includes("Приближается дата примерки")));
		});

		it("detects critical fitting deadline (< 24 hours)", () => {
			const order: DentalLabOrderDeadlineInfo = {
				id: "ord-3",
				patientId: "p-3",
				status: "sent_to_lab",
				createdAt: "2026-08-10T10:00:00.000Z",
				fittingDate: "2026-08-17T08:00:00.000Z", // +20 hours
				deliveryDate: "2026-08-22T12:00:00.000Z",
			};

			const assessment = DentalLabOrderService.evaluateDeadlines(order, refDate, 3);

			assert.equal(assessment.urgencyLevel, "critical");
			assert.equal(assessment.isFittingApproaching, true);
			assert.equal(assessment.requiresImmediateAction, true);
			assert.ok(assessment.warningMessages.some((m) => m.includes("осталось менее 24 часов")));
		});

		it("detects overdue fitting date", () => {
			const order: DentalLabOrderDeadlineInfo = {
				id: "ord-4",
				patientId: "p-4",
				status: "in_progress",
				createdAt: "2026-08-01T10:00:00.000Z",
				fittingDate: "2026-08-14T12:00:00.000Z", // 2 days ago!
				deliveryDate: "2026-08-20T12:00:00.000Z",
			};

			const assessment = DentalLabOrderService.evaluateDeadlines(order, refDate, 3);

			assert.equal(assessment.urgencyLevel, "overdue");
			assert.equal(assessment.isFittingOverdue, true);
			assert.equal(assessment.requiresImmediateAction, true);
			assert.ok(assessment.warningMessages.some((m) => m.includes("Просрочена дата примерки")));
		});

		it("detects overdue delivery date with high severity", () => {
			const order: DentalLabOrderDeadlineInfo = {
				id: "ord-5",
				patientId: "p-5",
				status: "ready_for_installation",
				createdAt: "2026-08-01T10:00:00.000Z",
				deliveryDate: "2026-08-15T12:00:00.000Z", // Yesterday
			};

			const assessment = DentalLabOrderService.evaluateDeadlines(order, refDate, 3);

			assert.equal(assessment.urgencyLevel, "overdue");
			assert.equal(assessment.isDeliveryOverdue, true);
			assert.equal(assessment.requiresImmediateAction, true);
			assert.ok(assessment.warningMessages.some((m) => m.includes("Критическая просрочка сдачи работы")));
		});

		it("treats completed orders as resolved with urgency 'completed'", () => {
			const order: DentalLabOrderDeadlineInfo = {
				id: "ord-6",
				patientId: "p-6",
				status: "installed_accepted",
				createdAt: "2026-08-01T10:00:00.000Z",
				fittingDate: "2026-08-10T12:00:00.000Z",
				deliveryDate: "2026-08-15T12:00:00.000Z",
				completedAt: "2026-08-15T16:00:00.000Z",
			};

			const assessment = DentalLabOrderService.evaluateDeadlines(order, refDate, 3);

			assert.equal(assessment.urgencyLevel, "completed");
			assert.equal(assessment.isFittingOverdue, false);
			assert.equal(assessment.isDeliveryOverdue, false);
			assert.equal(assessment.requiresImmediateAction, false);
			assert.equal(assessment.warningMessages.length, 0);
		});

		it("filters and sorts urgent orders by priority correctly", () => {
			const orders: DentalLabOrderDeadlineInfo[] = [
				{
					id: "ord-ok",
					patientId: "p-1",
					status: "in_progress",
					createdAt: "2026-08-01T00:00:00Z",
					fittingDate: "2026-08-30T00:00:00Z",
				},
				{
					id: "ord-overdue",
					patientId: "p-2",
					status: "in_progress",
					createdAt: "2026-08-01T00:00:00Z",
					deliveryDate: "2026-08-14T00:00:00Z",
				},
				{
					id: "ord-critical",
					patientId: "p-3",
					status: "in_progress",
					createdAt: "2026-08-01T00:00:00Z",
					fittingDate: "2026-08-17T00:00:00Z",
				},
				{
					id: "ord-done",
					patientId: "p-4",
					status: "installed_accepted",
					createdAt: "2026-08-01T00:00:00Z",
					deliveryDate: "2026-08-10T00:00:00Z",
				},
			];

			const filtered = DentalLabOrderService.filterUrgentOrders(orders, refDate, 3);

			assert.equal(filtered.length, 2);
			assert.equal(filtered[0]?.order.id, "ord-overdue"); // Overdue ranks #1
			assert.equal(filtered[1]?.order.id, "ord-critical"); // Critical ranks #2
		});
	});
});
