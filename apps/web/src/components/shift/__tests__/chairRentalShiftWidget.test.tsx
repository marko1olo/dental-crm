import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChairRentalShiftWidget } from "../ChairRentalShiftWidget";
import { DoctorShiftControlBar } from "../DoctorShiftControlBar";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function cleanSsrHtml(html: string): string {
	return html.replace(/<!--.*?-->/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

describe("ChairRentalShiftWidget (Виджет субаренды кресла и дохода врача)", () => {
	it("1. Рендерит все 4 модели субаренды и рассчитывает чистый доход врача", () => {
		// 48 500 ₽ выручка, 6 часов * 1 500 ₽ = 9 000 ₽ аренда, 6 500 ₽ ЗТЛ, 2 800 ₽ расходники
		// Расходы: 9 000 + 6 500 + 2 800 = 18 300 ₽
		// Чистый доход: 48 500 - 18 300 = 30 200 ₽
		const rawHtml = renderToString(
			React.createElement(ChairRentalShiftWidget, {
				doctorFullName: "Барабаш С.В.",
				clinicName: "ООО «Денте Стоматология»",
				initialGrossRevenueRub: 48500,
				initialHoursWorked: 6,
				initialLabExpensesRub: 6500,
				initialConsumablesRub: 2800,
			}),
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("Субаренда кресла и доход врача"));
		assert.ok(html.includes("Барабаш С.В."));
		assert.ok(html.includes("Почасовая"));
		assert.ok(html.includes("За смену"));
		assert.ok(html.includes("% выручки"));
		assert.ok(html.includes("Фикс / мес"));

		assert.ok(html.includes("30 200 ₽"), "Должен отображать чистый доход врача 30 200 ₽");
		assert.ok(html.includes("48 500 ₽"), "Должен отображать общую выручку 48 500 ₽");
		assert.ok(html.includes("−9 000 ₽"), "Должен отображать аренду кресла −9 000 ₽");
		assert.ok(html.includes("−6 500 ₽"), "Должен отображать расходы ЗТЛ −6 500 ₽");
		assert.ok(html.includes("−2 800 ₽"), "Должен отображать материалы −2 800 ₽");
	});

	it("2. Содержит 0 мультяшных эмодзи и кнопку формирования акта сверки в Thumb Zone", () => {
		const rawHtml = renderToString(
			React.createElement(ChairRentalShiftWidget, {
				doctorFullName: "Смирнова Е.В.",
				initialGrossRevenueRub: 60000,
			}),
		);

		assert.equal(
			EMOJI_REGEX.test(rawHtml),
			false,
			"ChairRentalShiftWidget не должен содержать мультяшных эмодзи",
		);
		assert.ok(rawHtml.includes("Печать акта сверки субаренды"));
	});

	it("3. Строго разделяет финансовые режимы в DoctorShiftControlBar (субаренда кресла без Табеля Т-13 и без Гонорара 30%)", () => {
		const rentalHtml = cleanSsrHtml(
			renderToString(
				React.createElement(DoctorShiftControlBar, {
					isShiftOpen: true,
					onToggleShift: () => {},
					onOpenPayrollModal: () => {},
					onOpenT13Timesheet: () => {},
					onOpenChairRentalAct: () => {},
					onChangeFinancialMode: () => {},
					financialMode: "chair_rental",
					chairRentalNetIncomeRub: 30200,
					chairRentalRentExpenseRub: 9000,
					shiftStats: {
						totalAppointments: 4,
						completedCount: 1,
						inProgressCount: 1,
						totalRevenueRub: 48500,
						doctorCommissionPct: 30,
						estimatedDoctorPayoutRub: 14550,
						hasActiveOvertime: false,
					},
				}),
			),
		);

		assert.ok(rentalHtml.includes("Чистый доход (субаренда)"));
		assert.ok(rentalHtml.includes("30 200 ₽"));
		assert.ok(rentalHtml.includes("Акт сверки субаренды"));
		assert.ok(rentalHtml.includes("Условия аренды"));
		assert.equal(
			rentalHtml.includes("Табель Т-13"),
			false,
			"В режиме субаренды кресла НЕ должен отображаться Табель Т-13 штатного персонала",
		);
		assert.equal(
			rentalHtml.includes("Гонорар врача (30%)"),
			false,
			"В режиме субаренды кресла НЕ должен отображаться зарплатный процент 30%",
		);
	});

	it("4. Выжжен каршеринговый симулятор: отсутствуют кнопки поминутного старта/остановки аренды и секундомеры (Мандаты 8e, 8n)", () => {
		const html = cleanSsrHtml(
			renderToString(
				React.createElement(ChairRentalShiftWidget, {
					doctorFullName: "Барабаш С.В.",
					initialGrossRevenueRub: 50000,
				}),
			),
		);

		assert.equal(
			html.includes("Арендовать кресло и начать приём"),
			false,
			"В виджете субаренды НЕ должно быть симулятора старта аренды (CRM != Reality Simulator)",
		);
		assert.equal(
			html.includes("Завершить аренду кресла"),
			false,
			"В виджете субаренды НЕ должно быть кнопки завершения аренды со счетчиком",
		);
		assert.equal(
			EMOJI_REGEX.test(html),
			false,
			"Виджет субаренды не должен содержать эмодзи",
		);
	});
});

