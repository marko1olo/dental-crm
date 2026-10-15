import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "vitest";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";

import {
	TelegramPatientPortalCabinet,
	type TelegramCabinetTab,
	type PatientAppointment,
	type PatientImagingScan,
	type TelegramPatientPortalCabinetProps,
} from "../TelegramPatientPortalCabinet";

import {
	CabinetHeader,
	CabinetAppointmentsTab,
	CabinetImagingTab,
	CabinetTaxTab,
	CabinetTaxSheet,
	CabinetFinanceTab,
	CabinetTeethTab,
	CabinetTreatmentPlansTab,
	CabinetBillingTab,
	CabinetBottomNav,
	useTelegramPortalCabinet,
	DEMO_APPOINTMENTS,
	DEMO_IMAGING_SCANS,
} from "../cabinet";

import {
	isDemoShowcaseMode,
	setRuntimeDemoMode,
} from "../../../../utils/demoModeEngine.js";

describe("TelegramPatientPortalCabinet Decomposed Architecture Test Suite", () => {
	beforeEach(() => {
		setRuntimeDemoMode(null);
	});

	afterEach(() => {
		setRuntimeDemoMode(null);
	});

	it("1. Public API & Type contracts are 100% preserved", () => {
		assert.equal(typeof TelegramPatientPortalCabinet, "object"); // React.memo wraps into object
		assert.equal(typeof CabinetHeader, "object");
		assert.equal(typeof CabinetAppointmentsTab, "object");
		assert.equal(typeof CabinetImagingTab, "object");
		assert.equal(typeof CabinetTaxTab, "object");
		assert.equal(typeof CabinetTaxSheet, "object");
		assert.equal(typeof CabinetFinanceTab, "object");
		assert.equal(typeof CabinetTeethTab, "object");
		assert.equal(typeof CabinetTreatmentPlansTab, "object");
		assert.equal(typeof CabinetBillingTab, "object");
		assert.equal(typeof CabinetBottomNav, "object");
		assert.equal(typeof useTelegramPortalCabinet, "function");
	});

	it("2. Renders appointments tab by default with header and bottom navigation", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				patientId: "patient-1",
			}),
		);

		// Header
		assert.ok(html.includes("DENTE Pocket Clinic"));
		assert.ok(html.includes("Кабинет пациента"));
		assert.ok(html.includes((2750).toLocaleString("ru-RU")));

		// Appointments list
		assert.ok(html.includes("Предстоящие"));
		assert.ok(html.includes("Прошедшие"));
		assert.ok(html.includes("Д-р Смирнов"));
		assert.ok(html.includes("+ Записаться"));

		// Bottom Nav
		assert.ok(html.includes("Зубы"));
		assert.ok(html.includes("Записи"));
		assert.ok(html.includes("Снимки"));
		assert.ok(html.includes("Налог 13%"));
		assert.ok(html.includes("Финансы"));
	});

	it("3. Renders teeth complaints tab when initialTab='teeth'", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				initialTab: "teeth",
			}),
		);

		assert.ok(html.includes("Зубная формула и жалобы"));
		assert.ok(html.includes("Нажмите на зуб для фиксации симптомов"));
	});

	it("4. Renders imaging tab with radiology viewer and scan carousel when initialTab='imaging'", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				initialTab: "imaging",
			}),
		);

		assert.ok(html.includes("Цифровая диагностика") && html.includes("КТ"));
		assert.ok(html.includes("RVG снимок #16"));
		assert.ok(html.includes("3D КЛКТ сегмента #36"));
		assert.ok(html.includes("Инв."));
		assert.ok(html.includes("1x"));
		assert.ok(html.includes("Скачать снимок (DICOM/PNG)"));
	});

	it("5. Renders tax deduction tab and tax sheet drawer when initialTab='tax' and initialTaxSheetOpen=true", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				initialTab: "tax",
				initialTaxSheetOpen: true,
			}),
		);

		// Tax Tab
		assert.ok(html.includes("Налоговый вычет 13% (НДФЛ)"));
		assert.ok(html.includes("Официальная справка"));
		assert.ok(html.includes("Оформить справку для налоговой"));

		// Tax Sheet Drawer
		assert.ok(html.includes("tg-tax-sheet"));
		assert.ok(html.includes("Налоговый период (год оплаты):"));
		assert.ok(html.includes("ФИО налогоплательщика:"));
		assert.ok(html.includes("ИНН (12 цифр):"));
		assert.ok(html.includes("Код медицинской услуги:"));
		assert.ok(html.includes("Сформировать справку КНД 1151156"));
	});

	it("6. Renders finance tab with bonus balances, referral card and operation history", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				initialTab: "finance",
			}),
		);

		assert.ok(html.includes("Финансы") && html.includes("Бонусы"));
		assert.ok(html.includes("Бонусный счет DENTE"));
		assert.ok(html.includes("1 бонус = 1 рубль"));
		assert.ok(html.includes("Депозит клиники (аванс):"));
		assert.ok(html.includes((15000).toLocaleString("ru-RU")));
		assert.ok(html.includes("Подари другу 1 000 ₽"));
		assert.ok(html.includes("История начислений и операций:"));
	});

	it("7. Isolated TreatmentPlansTab renders empty state and active stages cleanly", () => {
		const emptyHtml = renderToStaticMarkup(
			createElement(CabinetTreatmentPlansTab, { plans: [] }),
		);
		assert.ok(emptyHtml.includes("Нет активных планов лечения"));

		const plansHtml = renderToStaticMarkup(
			createElement(CabinetTreatmentPlansTab, {
				plans: [
					{
						id: "plan-1",
						title: "Тотальная имплантация верхней челюсти",
						totalCostRub: 240000,
						paidCostRub: 120000,
						status: "approved",
						stages: [
							{ id: "s1", title: "3D КТ и хирургический шаблон", costRub: 35000, status: "completed" },
							{ id: "s2", title: "Установка 4 имплантатов", costRub: 160000, status: "in_progress" },
							{ id: "s3", title: "Временный несъемный мост", costRub: 45000, status: "pending" },
						],
					},
				],
			}),
		);
		assert.ok(plansHtml.includes("Тотальная имплантация верхней челюсти"));
		assert.ok(plansHtml.includes("Выполнено: 50%"));
		assert.ok(plansHtml.includes((120000).toLocaleString("ru-RU")));
		assert.ok(plansHtml.includes("Согласован"));
	});
});
