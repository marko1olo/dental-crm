/**
 * apps/web/src/components/analytics/__tests__/executiveSsotReports.test.tsx
 *
 * Целевые тесты трех канонических SSOT экранов аналитики:
 * 1. ExecutiveFinancialSummary
 * 2. DoctorPayrollReport
 * 3. ChairOccupancyReport
 * 4. ExecutiveDashboard
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChairOccupancyReport } from "../ChairOccupancyReport";
import { DoctorPayrollReport } from "../DoctorPayrollReport";
import { ExecutiveDashboard } from "../ExecutiveDashboard";
import { ExecutiveFinancialSummary } from "../ExecutiveFinancialSummary";
import {
	generatePatientRecallWhatsAppMessage,
	getOccupancyStatus,
	getRebookingStatus,
} from "../analyticsCatalogData";

describe("Executive SSOT Analytics Screens", () => {
	test("ExecutiveFinancialSummary рендерится и содержит главные финансовые блоки", () => {
		const html = renderToString(
			<ExecutiveFinancialSummary period="month" />,
		);

		assert.ok(html.includes("executive-financial-summary"), "Содержит testid");
		assert.ok(html.includes("Выручка кассы"), "Отображает блок выручки");
		assert.ok(html.includes("Оформлено нарядов"), "Отображает блок нарядов");
		assert.ok(html.includes("Средний чек"), "Отображает средний чек");
		assert.ok(html.includes("Наличные (Касса)"), "Отображает наличные");
		assert.ok(html.includes("Банковские карты"), "Отображает карты");
		assert.ok(html.includes("Оплата по QR (СБП)"), "Отображает СБП");
		assert.ok(html.includes("Авансы и депозиты"), "Отображает списание авансов");
		assert.ok(!html.includes("disabled"), "Кнопки никогда не disabled (Мандат 8e)");
		assert.ok(!html.includes("NaN"), "Не содержит утечек NaN");
		assert.ok(!html.includes("undefined"), "Не содержит утечек undefined");
	});

	test("DoctorPayrollReport рендерится и содержит ведомость Net Revenue и расходы ЗТЛ", () => {
		const html = renderToString(
			<DoctorPayrollReport period="month" />,
		);

		assert.ok(html.includes("doctor-payroll-report"), "Содержит testid");
		assert.ok(html.includes("Оказано услуг"), "Отображает оказано услуг");
		assert.ok(html.includes("Списано техкарт"), "Отображает списание материалов");
		assert.ok(html.includes("Лаборатория (ЗТЛ)"), "Отображает расходы зуботехнической лаборатории ЗТЛ");
		assert.ok(html.includes("Чистая выручка (Net)"), "Отображает Net Revenue");
		assert.ok(html.includes("Итого к выплате (ФОТ)"), "Отображает итого к выплате");
		assert.ok(!html.includes("disabled"), "Кнопки никогда не disabled (Мандат 8e)");
		assert.ok(!html.includes("NaN"), "Не содержит утечек NaN");
		assert.ok(!html.includes("undefined"), "Не содержит утечек undefined");
	});

	test("ChairOccupancyReport рендерится и содержит учет загрузки кресел со статусом нормы 65–85%", () => {
		const html = renderToString(
			<ChairOccupancyReport period="month" />,
		);

		assert.ok(html.includes("chair-occupancy-report"), "Содержит testid");
		assert.ok(html.includes("Средняя загрузка клиники"), "Отображает среднюю загрузку");
		assert.ok(html.includes("Часов в плане"), "Отображает план часов");
		assert.ok(html.includes("Отработано часов"), "Отображает отработанные часы");
		assert.ok(html.includes("Свободные окна"), "Отображает свободные окна");
		assert.ok(html.includes("65–85%"), "Отображает стоматологическую норму 65–85%");
		assert.ok(!html.includes("disabled"), "Кнопки никогда не disabled (Мандат 8e)");
		assert.ok(!html.includes("NaN"), "Не содержит утечек NaN");
		assert.ok(!html.includes("undefined"), "Не содержит утечек undefined");
	});

	test("ExecutiveDashboard объединяет 3 экрана и предоставляет 1-клик переключение", () => {
		const html = renderToString(
			<ExecutiveDashboard period="month" />,
		);

		assert.ok(html.includes("executive-dashboard-root"), "Содержит корневой контейнер");
		assert.ok(html.includes("Финансовый пульт"), "Содержит таб Финансовый пульт");
		assert.ok(html.includes("Зарплаты врачей (Net)"), "Содержит таб Зарплаты врачей");
		assert.ok(html.includes("Загрузка кресел"), "Содержит таб Загрузка кресел");
	});

	test("Recall WhatsApp генератор формирует чистое приглашение без regex-парсинга", () => {
		const msg3m = generatePatientRecallWhatsAppMessage("Иванов Иван", "д-ра Смирновой", "Dente", 3);
		assert.ok(msg3m.includes("Иванов Иван"), "Содержит имя пациента");
		assert.ok(msg3m.includes("Dente"), "Содержит название клиники");
		assert.ok(msg3m.includes("3 месяца") || msg3m.includes("контрольном"), "Корректный текст для 3 мес");

		const msg6m = generatePatientRecallWhatsAppMessage("Петрова Анна", "д-ра Смирновой", "Dente", 6);
		assert.ok(msg6m.includes("6 месяцев"), "Напоминает о 6 месяцах для профгигиены Air-Flow");
	});
});
