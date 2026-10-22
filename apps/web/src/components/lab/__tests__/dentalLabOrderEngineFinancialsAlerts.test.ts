import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateZtlWageFinancials,
	detectLabDeadlineAlert,
	createDentalLabOrderRecord,
} from "../dentalLabOrderEngine";

describe("dentalLabOrderEngine — Financials & Deadline Alerts", () => {
	const fixedToday = "2026-09-25";

	it("вычитает себестоимость ЗТЛ из выручки и рассчитывает ЗП врача строго в копейках", () => {
		const fin = calculateZtlWageFinancials({
			unitsCount: 1,
			patientPriceKopecks: 2400000,
			ztlCostKopecks: 750000,
			doctorSharePercent: 20,
		});

		assert.equal(fin.patientPriceKopecks, 2400000);
		assert.equal(fin.ztlCostKopecks, 750000);
		assert.equal(fin.doctorWageBaseKopecks, 1650000);
		assert.equal(fin.doctorWageKopecks, 330000);
		assert.equal(fin.clinicMarginKopecks, 1320000);
		assert.ok(fin.isBalanced);
		assert.equal(fin.doctorWageKopecks + fin.clinicMarginKopecks, fin.doctorWageBaseKopecks);
	});

	it("корректно масштабирует финансовый расчет на несколько единиц коронок", () => {
		const fin = calculateZtlWageFinancials({
			unitsCount: 3,
			patientPriceRub: 25000,
			ztlCostRub: 8000,
			doctorSharePercent: 25,
		});

		assert.equal(fin.patientPriceRub, 75000);
		assert.equal(fin.ztlCostRub, 24000);
		assert.equal(fin.doctorWageBaseRub, 51000);
		assert.equal(fin.doctorWageRub, 12750);
		assert.equal(fin.clinicMarginRub, 38250);
		assert.ok(fin.isBalanced);
	});

	it("срабатывает критический алерт непоступления работы в клинику при визите сегодня", () => {
		const alert = detectLabDeadlineAlert({
			status: "in_progress",
			deadlineDate: "2026-09-25",
			scheduledVisitDate: "2026-09-25",
			todayDate: fixedToday,
			patientName: "Барабаш С.В.",
			toothNotation: "16",
		});

		assert.ok(alert.hasAlert);
		assert.ok(alert.isDelayedAlert);
		assert.equal(alert.severity, "CRITICAL_TODAY");
		assert.ok(alert.badgeTextRu.includes("Работа еще не поступила в клинику"));
		assert.ok(alert.messageRu.includes("Работа из ЗТЛ еще не поступила в клинику!"));
	});

	it("правильно оценивает OVERDUE и OK статусы нарядов", () => {
		const alertOverdue = detectLabDeadlineAlert({
			status: "in_progress",
			deadlineDate: "2026-09-20",
			scheduledVisitDate: "2026-09-28",
			todayDate: fixedToday,
		});
		assert.ok(alertOverdue.hasAlert);
		assert.equal(alertOverdue.severity, "OVERDUE");

		const alertReady = detectLabDeadlineAlert({
			status: "ready_in_clinic",
			deadlineDate: "2026-09-25",
			scheduledVisitDate: "2026-09-25",
			todayDate: fixedToday,
		});
		assert.ok(!alertReady.hasAlert);
		assert.equal(alertReady.severity, "OK");
	});

	it("создает полный наряд ЗТЛ через createDentalLabOrderRecord", () => {
		const order = createDentalLabOrderRecord({
			patientName: "Кузнецов И.П.",
			doctorName: "Д-р Орлов А.В.",
			labName: "ArtDent Премиум Лаб",
			teethFdi: [21, 22],
			constructionType: "crown_emax",
			vitaShade: "A1",
		});

		assert.ok(order.id.startsWith("ztl-ord-"));
		assert.ok(order.orderNumber.startsWith("ЗТЛ-"));
		assert.equal(order.patientName, "Кузнецов И.П.");
		assert.equal(order.constructionType, "crown_emax");
		assert.equal(order.status, "sent_to_lab");
		assert.equal(order.patientPriceKopecks, 5200000);
		assert.equal(order.ztlCostKopecks, 1700000);
	});
});
