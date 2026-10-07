import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";
import {
	TelegramInteractiveToothPicker,
	TOOTH_COMPLAINT_CATALOG,
	getToothAnatomicalTitle,
	type ToothComplaint,
} from "../TelegramInteractiveToothPicker";
import {
	TelegramMiniAppBooking,
	SPECIALIST_CATEGORIES,
} from "../TelegramMiniAppBooking";
import { TelegramMiniAppView } from "../TelegramMiniAppView";

describe("Telegram WebApp Mini-App & Interactive Tooth Formula Flow", () => {
	it("verifies tooth anatomical names and groups across FDI adult and pediatric arches", () => {
		// FDI 11: центральный резец
		const t11 = getToothAnatomicalTitle(11);
		assert.equal(t11.name, "Центральный резец");
		assert.equal(t11.group, "incisor");
		assert.equal(t11.archName, "Верхняя челюсть");

		// FDI 16: первый моляр
		const t16 = getToothAnatomicalTitle(16);
		assert.ok(t16.name.includes("Первый моляр"));
		assert.equal(t16.group, "molar");

		// FDI 18: третий моляр (зуб мудрости)
		const t18 = getToothAnatomicalTitle(18);
		assert.ok(t18.name.includes("зуб мудрости"));

		// Молочный зуб FDI 51
		const t51 = getToothAnatomicalTitle(51);
		assert.ok(t51.name.includes("Молочный"));
		assert.equal(t51.group, "incisor");
	});

	it("verifies all 5 mandatory clinical complaint types are present in catalog with required metadata", () => {
		const ids = TOOTH_COMPLAINT_CATALOG.map((c) => c.id);
		assert.ok(ids.includes("acute_throbbing"), "Has acute throbbing pain");
		assert.ok(ids.includes("fracture_filling"), "Has fracture/filling complaint");
		assert.ok(ids.includes("food_impaction_caries"), "Has food impaction / caries complaint");
		assert.ok(ids.includes("temperature_sensitivity"), "Has temperature sensitivity");
		assert.ok(ids.includes("crown_implant"), "Has crown/implant request");

		// Острая боль помечена как CITO
		const acute = TOOTH_COMPLAINT_CATALOG.find((c) => c.id === "acute_throbbing");
		assert.equal(acute?.cito, true);
	});

	it("renders TelegramInteractiveToothPicker with adult dentition (32 teeth) by default and shows marked complaints", () => {
		const complaints: ToothComplaint[] = [
			{
				toothNumber: 16,
				complaintType: "acute_throbbing",
				symptomLabel: "Острая пульсирующая боль",
				painLevel: 5,
				cito: true,
				notes: "Пульсирует ночью",
			},
			{
				toothNumber: 24,
				complaintType: "food_impaction_caries",
				symptomLabel: "Застревает пища / кариес",
				painLevel: 2,
				cito: false,
			},
		];

		const html = renderToStaticMarkup(
			createElement(TelegramInteractiveToothPicker, {
				selectedComplaints: complaints,
				onSaveComplaint: () => {},
				onRemoveComplaint: () => {},
			}),
		);

		// Dentition switcher
		assert.ok(html.includes("Взрослый прикус (32 зуба)"));
		assert.ok(html.includes("Молочные зубы (20 зубов)"));

		// Quadrant switcher
		assert.ok(html.includes("По квадрантам"));
		assert.ok(html.includes("Вся дуга"));

		// Marked complaints summary
		assert.ok(html.includes("Отмеченные зубы (2):"));
		assert.ok(html.includes("Зуб 16"));
		assert.ok(html.includes("Зуб 24"));
		assert.ok(html.includes("Срочно"));
	});

	it("renders TelegramMiniAppBooking with 4 specialist categories and attached tooth complaints", () => {
		const complaints: ToothComplaint[] = [
			{
				toothNumber: 16,
				complaintType: "acute_throbbing",
				symptomLabel: "Острая пульсирующая боль",
				painLevel: 4,
				cito: true,
			},
		];

		const html = renderToStaticMarkup(
			createElement(TelegramMiniAppBooking, {
				attachedComplaints: complaints,
				organizationId: "org-test-1",
				patientId: "patient-test-1",
			}),
		);

		// 4 направления врачей
		assert.ok(html.includes("Терапевт"));
		assert.ok(html.includes("Хирург / Имплантолог"));
		assert.ok(html.includes("Ортодонт"));
		assert.ok(html.includes("Гигиенист"));

		// Баннер прикрепленных зубов
		assert.ok(html.includes("Выбрано для осмотра: 1 зуб"));
		assert.ok(html.includes("#16"));
		assert.ok(html.includes("Острая пульсирующая боль"));

		// Свободные окна для записи
		assert.ok(html.includes("Свободное время"));
		assert.ok(html.includes("10:30"));

		// Кнопка записи
		assert.ok(html.includes("Записаться к доктору"));
	});

	it("renders full TelegramMiniAppView with navigation bar, responsive safe area container and reactive tooth complaints badge", () => {
		const html = renderToStaticMarkup(
			createElement(TelegramMiniAppView, {
				organizationId: "org-1",
				patientId: "patient-1",
				initialTab: "odontogram",
			}),
		);

		// Brand and header
		assert.ok(html.includes("DENTE Pocket Clinic"));
		assert.ok(html.includes("Здравствуйте"));

		// Nav bar
		assert.ok(html.includes("Зубная формула"));
		assert.ok(html.includes("Онлайн-запись"));
		assert.ok(html.includes("Моё здоровье"));

		// Tooth badge in bottom nav
		assert.ok(html.includes("tg-nav-badge"));
	});
});
