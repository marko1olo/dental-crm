import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_MAX_SHIFT_DURATION_HOURS,
	DEFAULT_MAX_SHIFT_DURATION_MS,
	SHIFT_START_TIME_KEY,
} from "../../../shiftViewModules/useShiftViewController";
import { renderToString } from "react-dom/server";
import React from "react";
import { MobileShiftHeroCard } from "../mobileCockpit/MobileShiftHeroCard";

function cleanSsrHtml(html: string): string {
	return html.replace(/<!--.*?-->/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

describe("DoctorShiftAutoCloseBySchedule & Role Separation Invariants (Мандаты 8e, 8n)", () => {
	it("1. Константы авто-закрытия смен: максимальная смена 12 часов (без блокировки врача и кассы)", () => {
		assert.equal(DEFAULT_MAX_SHIFT_DURATION_HOURS, 12, "Лимит смены врача должен быть ровно 12 часов");
		assert.equal(
			DEFAULT_MAX_SHIFT_DURATION_MS,
			12 * 60 * 60 * 1000,
			"Лимит смены в мс должен составлять 43 200 000 мс",
		);
		assert.equal(
			SHIFT_START_TIME_KEY,
			"dente_doctor_shift_start_time",
			"Ключ отметки времени старта смены в local storage",
		);
	});

	it("2. Разделение ролей: врач видит только свой клинический заработок, но не видит сейф и инкассацию", () => {
		// Рендер карточки смены под ролью 'doctor'
		const doctorViewHtml = cleanSsrHtml(
			renderToString(
				React.createElement(MobileShiftHeroCard, {
					doctorName: "Д-р Барабаш С.В.",
					doctorSpecialty: "Врач-стоматолог ортопед",
					cabinetName: "Кабинет №1",
					totalRevenueRub: 45000,
					cashInDrawerRub: 15000,
					cardSumRub: 25000,
					sbpSumRub: 5000,
					doctorCommissionPct: 30,
					estimatedDoctorPayoutRub: 13500,
					userRole: "doctor",
				}),
			),
		);

		// Врач видит свой доход
		assert.ok(doctorViewHtml.includes("Начислено врачу (30%):"));
		assert.ok(doctorViewHtml.includes("13 500 ₽"));

		// Врач НЕ видит остаток кассы в сейфе и общие каналы клиники
		assert.equal(
			doctorViewHtml.includes("В кассе:"),
			false,
			"Врач НЕ должен видеть общий остаток наличных в кассе/сейфе (приватность клиники)",
		);
		assert.equal(
			doctorViewHtml.includes("15 000 ₽"),
			false,
			"Сумма наличных в ящике скрыта от врача",
		);
	});

	it("3. Разделение ролей: администратор/руководитель видит полную кассу, каналы и остаток наличных", () => {
		// Рендер карточки смены под ролью 'admin'
		const adminViewHtml = cleanSsrHtml(
			renderToString(
				React.createElement(MobileShiftHeroCard, {
					doctorName: "Д-р Барабаш С.В.",
					doctorSpecialty: "Врач-стоматолог ортопед",
					cabinetName: "Кабинет №1",
					totalRevenueRub: 45000,
					cashInDrawerRub: 15000,
					cardSumRub: 25000,
					sbpSumRub: 5000,
					doctorCommissionPct: 30,
					estimatedDoctorPayoutRub: 13500,
					userRole: "admin",
				}),
			),
		);

		// Администратор видит общую выручку и каналы
		assert.ok(adminViewHtml.includes("Выручка за день"));
		assert.ok(adminViewHtml.includes("45 000 ₽"));
		assert.ok(adminViewHtml.includes("Наличные"));
		assert.ok(adminViewHtml.includes("15 000 ₽"));
		assert.ok(adminViewHtml.includes("POS карты"));
		assert.ok(adminViewHtml.includes("25 000 ₽"));
		assert.ok(adminViewHtml.includes("СБП QR"));
		assert.ok(adminViewHtml.includes("5 000 ₽"));
	});
});
