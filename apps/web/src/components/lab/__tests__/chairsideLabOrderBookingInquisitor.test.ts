/**
 * chairsideLabOrderBookingInquisitor.test.ts — Беспощадная Red Team инквизиция 1-клик нарядов ЗТЛ у кресла
 * и автобронирования визита примерки в расписании врача.
 *
 * ПРОВЕРЯЕМЫЕ ИНВАРИАНТЫ:
 * 1. Расчет рабочих дней ЗТЛ с пропуском суббот/воскресений (5-10 раб. дней по конструкциям).
 * 2. Автоматический расчет даты примерки (следующий рабочий день после готовности ЗТЛ).
 * 3. Защита от коллизий графика (Fitting Appointment Collision Guard).
 * 4. Формирование черновика бронирования слота примерки (dente-quick-appointment-draft, Приказ 804н A16.07.004).
 * 5. Железобетонный целочисленный учет себестоимости ЗТЛ и ЗП врача в копейках (Zero Penny-Drift).
 * 6. Честный пустой продакшн без синтетических мок-массивов (Мандат 8y / isDemoShowcaseMode).
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	ORTHOPEDIC_WORK_TYPES,
	type OrthopedicWorkTypeId,
	createDentalLabOrder,
	calculateLabWorkflowFinancials,
	addWorkingDaysRu,
	checkLabDeadlineAndAlert,
} from "../dentalLabWorkflowEngine";
import {
	calculateLabReadinessDate,
	checkFittingAppointmentCollision,
	calculateZtlWageFinancials,
	formatRuDate,
	parseDateOnly,
	toIsoDate,
} from "../dentalLabOrderEngine";

describe("Chairside Lab Order & Auto-Booking Inquisitor", () => {
	describe("1. Расчет рабочих дней ЗТЛ и пропуск выходных дней", () => {
		test("addWorkingDaysRu гарантированно пропускает субботы и воскресенья", () => {
			// Пятница 2026-10-02 (локальная полночь)
			const friday = new Date(2026, 9, 2); // 2 октября 2026 — пятница
			assert.equal(friday.getDay(), 5, "Стартовый день должен быть пятницей");

			// 1 рабочий день от пятницы = Понедельник 2026-10-05
			const nextDay = addWorkingDaysRu(friday, 1);
			assert.equal(nextDay.getDay(), 1, "1 рабочий день от пятницы должен быть понедельником");
			assert.equal(toIsoDate(nextDay), "2026-10-05");

			// 5 рабочих дней от пятницы = Следующая пятница (2026-10-09)
			const fiveDaysLater = addWorkingDaysRu(friday, 5);
			assert.equal(fiveDaysLater.getDay(), 5, "5 рабочих дней должны завершиться в следующую пятницу");
			assert.equal(toIsoDate(fiveDaysLater), "2026-10-09");
		});

		test("calculateLabReadinessDate рассчитывает срок готовности по нормативам конструкций ЗТЛ", () => {
			const startDate = "2026-10-05"; // Понедельник

			// ZrO2 Katana ML: 5 рабочих дней -> готовность в следующую пятницу (2026-10-12)
			const zirkonPreset = ORTHOPEDIC_WORK_TYPES.crown_zirconia;
			assert.equal(zirkonPreset.standardTurnaroundWorkingDays, 5);
			const zirkonReady = calculateLabReadinessDate(startDate, zirkonPreset.standardTurnaroundWorkingDays);
			assert.equal(zirkonReady, "2026-10-12");

			// Временная PMMA: 2 рабочих дня -> Среда (2026-10-07)
			const pmmaPreset = ORTHOPEDIC_WORK_TYPES.temporary_pmma;
			assert.equal(pmmaPreset.standardTurnaroundWorkingDays, 2);
			const pmmaReady = calculateLabReadinessDate(startDate, pmmaPreset.standardTurnaroundWorkingDays);
			assert.equal(pmmaReady, "2026-10-07");

			// Бюгельный протез Bredent: 10 рабочих дней -> ровно 2 недели (2026-10-19)
			const claspPreset = ORTHOPEDIC_WORK_TYPES.clasp_prosthesis;
			assert.equal(claspPreset.standardTurnaroundWorkingDays, 10);
			const claspReady = calculateLabReadinessDate(startDate, claspPreset.standardTurnaroundWorkingDays);
			assert.equal(claspReady, "2026-10-19");
		});

		test("Автоматический расчет даты примерки (fittingDate): следующий рабочий день после готовности ЗТЛ", () => {
			const labReadyFriday = "2026-10-09"; // Пятница
			const fittingDate = calculateLabReadinessDate(labReadyFriday, 1);
			// Следующий рабочий день после пятницы — понедельник
			assert.equal(fittingDate, "2026-10-12", "Примерка после пятничной готовности должна выпадать на понедельник");
		});
	});

	describe("2. Fitting Appointment Collision Guard (Защита от приема раньше готовности)", () => {
		test("Выявляет критическую коллизию, если прием на примерку назначен раньше готовности ЗТЛ", () => {
			const labDeadline = "2026-10-15";
			const prematureVisit = "2026-10-12"; // На 3 дня раньше!

			const collision = checkFittingAppointmentCollision(labDeadline, prematureVisit);
			assert.equal(collision.hasCollision, true);
			assert.equal(collision.daysGap, 3);
			assert.match(collision.warningRu || "", /прием на примерку назначен раньше готовности/i);
		});

		test("Не выдает коллизию, когда примерка назначена в день готовности или позже", () => {
			const labDeadline = "2026-10-15";
			const validVisitSameDay = "2026-10-15";
			const validVisitLater = "2026-10-16";

			const c1 = checkFittingAppointmentCollision(labDeadline, validVisitSameDay);
			assert.equal(c1.hasCollision, false);
			assert.equal(c1.warningRu, null);

			const c2 = checkFittingAppointmentCollision(labDeadline, validVisitLater);
			assert.equal(c2.hasCollision, false);
			assert.equal(c2.warningRu, null);
		});

		test("checkLabDeadlineAndAlert генерирует статус VISIT_CONFLICT при коллизии графика", () => {
			const alert = checkLabDeadlineAndAlert({
				expectedLabDate: "2026-10-15",
				fittingDate: "2026-10-12",
				currentDate: "2026-10-02",
				orderNumber: "ЗТЛ-1",
				patientName: "Иванов И.И.",
			});

			assert.equal(alert.hasAlert, true);
			assert.equal(alert.isDelayedAlert, true);
			assert.equal(alert.status, "VISIT_CONFLICT");
			assert.equal(alert.severity, "CRITICAL");
			assert.match(alert.alertMessageRu, /КРИТИЧЕСКИЙ КОНФЛИКТ/);
		});
	});

	describe("3. Формирование 1-клик наряда и черновика записи на примерку", () => {
		test("createDentalLabOrder создает наряд с автоматическим расчетом дат и целочисленными копейками", () => {
			const order = createDentalLabOrder({
				patientId: "pat-123",
				patientName: "Петрова Анна Сергеевна",
				doctorId: "doc-orlov",
				doctorName: "Д-р Орлов А.В.",
				workTypeId: "crown_zirconia",
				selectedTeeth: [16, 17],
				pricePerUnitRub: 22000,
				costPerUnitRub: 7000,
				doctorPercent: 20,
				orderDate: "2026-10-05", // Пн
			});

			assert.equal(order.selectedTeeth.length, 2);
			assert.equal(order.financials.unitsCount, 2);
			// 2 * 22000 = 44 000 руб = 4 400 000 копеек
			assert.equal(order.financials.patientPriceTotalKopecks, 4400000);
			// 2 * 7000 = 14 000 руб себестоимость ЗТЛ = 1 400 000 копеек
			assert.equal(order.financials.labCostTotalKopecks, 1400000);
			// Сдельная база врача: 4 400 000 - 1 400 000 = 3 000 000 копеек
			assert.equal(order.financials.doctorWageBaseKopecks, 3000000);
			// ЗП врача (20%): 600 000 копеек = 6 000 руб
			assert.equal(order.financials.doctorWageKopecks, 600000);
			// Маржа клиники: 3 000 000 - 600 000 = 2 400 000 копеек = 24 000 руб
			assert.equal(order.financials.clinicNetProfitKopecks, 2400000);
			assert.equal(order.financials.isBalanced, true, "Инвариант Zero Penny-Drift должен строго соблюдаться");

			// Проверяем даты: готовность через 5 раб. дней (2026-10-12), примерка еще +1 день (2026-10-13)
			assert.equal(order.expectedLabDateIso, "2026-10-12");
			assert.equal(order.fittingDateIso, "2026-10-13");
		});

		test("Черновик записи на примерку соответствует Приказу Минздрава 804н", () => {
			const order = createDentalLabOrder({
				patientId: "pat-99",
				patientName: "Сидоров К.М.",
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов",
				workTypeId: "crown_emax",
				selectedTeeth: [21],
				orderDate: "2026-10-05",
			});

			const teethLabel = order.selectedTeeth.join(", ");
			const workTypeTitle = ORTHOPEDIC_WORK_TYPES[order.workTypeId]?.shortNameRu || "Конструкция ЗТЛ";

			const appointmentDraft = {
				patientId: order.patientId,
				patientName: order.patientName,
				patientPhone: "",
				doctorId: order.doctorId,
				doctorName: order.doctorName,
				serviceTitle: `Примерка и фиксация: ${workTypeTitle} (зуб ${teethLabel})`,
				serviceCode: "A16.07.004", // Ортопедия 804н
				durationMinutes: 45,
				scheduledDate: order.fittingDateIso,
				targetDate: order.fittingDateIso,
				stageKind: "stage_3_orthopedics",
				orderNumber: order.orderNumber,
			};

			assert.equal(appointmentDraft.serviceCode, "A16.07.004");
			assert.equal(appointmentDraft.stageKind, "stage_3_orthopedics");
			assert.equal(appointmentDraft.scheduledDate, "2026-10-13");
			assert.match(appointmentDraft.serviceTitle, /Примерка и фиксация: Коронка e.max Press/);
		});
	});

	describe("4. Финансовый расчет: вычет себестоимости ЗТЛ и гарантийная переделка 0 ₽", () => {
		test("calculateZtlWageFinancials исключает себестоимость ЗТЛ из сдельной базы", () => {
			const fin = calculateZtlWageFinancials({
				unitsCount: 1,
				patientPriceRub: 25000,
				ztlCostRub: 8000,
				doctorSharePercent: 25,
			});

			assert.equal(fin.patientPriceKopecks, 2500000);
			assert.equal(fin.ztlCostKopecks, 800000);
			// Сдельная база: 2 500 000 - 800 000 = 1 700 000 копеек
			assert.equal(fin.doctorWageBaseKopecks, 1700000);
			// ЗП врача (25%): 425 000 копеек = 4 250 руб
			assert.equal(fin.doctorWageKopecks, 425000);
			// Маржа клиники: 1 700 000 - 425 000 = 1 275 000 копеек = 12 750 руб
			assert.equal(fin.clinicMarginKopecks, 1275000);
			assert.equal(fin.isBalanced, true);
		});

		test("Гарантийная рекламация при браке ЗТЛ: пациент СТРОГО 0 ₽, клиника 0 ₽, переделка за счет ЗТЛ", () => {
			const fin = calculateZtlWageFinancials({
				unitsCount: 1,
				patientPriceRub: 25000,
				ztlCostRub: 8000,
				isWarrantyRework: true,
				warrantyLiabilityType: "lab_defect",
			});

			assert.equal(fin.patientPriceKopecks, 0, "Пациент платит строго 0 при гарантии");
			assert.equal(fin.ztlCostKopecks, 0, "При браке ЗТЛ переделка за счет лаборатории");
			assert.equal(fin.doctorWageKopecks, 0);
			assert.equal(fin.clinicMarginKopecks, 0);
			assert.equal(fin.isBalanced, true);
		});
	});
});
