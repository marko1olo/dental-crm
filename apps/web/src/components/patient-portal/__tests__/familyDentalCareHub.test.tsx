import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	FamilyDentalCareHubWidget,
	DEFAULT_PRESET_FAMILY_CARE_HUB,
	type FamilyDentalCareHubData,
} from "../FamilyDentalCareHubWidget.js";

describe("FamilyDentalCareHubWidget (Family Dental Prevention & CAMBRA Hub)", () => {
	it("renders family care hub header, family name, score progress bar, and next checkup date", () => {
		const html = renderToString(
			<FamilyDentalCareHubWidget data={DEFAULT_PRESET_FAMILY_CARE_HUB} />,
		);

		assert.ok(html.includes("Семейный хаб профилактики"));
		assert.ok(html.includes("Семья Ивановых"));
		assert.ok(html.includes("Индекс защиты семьи 88%"));
		assert.ok(html.includes("CAMBRA Guard"));
		assert.ok(html.includes("15 сентября 2026"));
		assert.ok(html.includes("Напомнить семье"));
	});

	it("renders all family members with relationship, age, CAMBRA risk badges, and hygiene due dates", () => {
		const html = renderToString(
			<FamilyDentalCareHubWidget data={DEFAULT_PRESET_FAMILY_CARE_HUB} />,
		);

		// Mom
		assert.ok(html.includes("Иванова Анна Сергеевна"));
		assert.ok(html.includes("Мама (Владелец) • 36 лет"));
		assert.ok(html.includes("Низкий риск кариеса"));
		assert.ok(html.includes("15 сентября 2026"));

		// Dad (Overdue)
		assert.ok(html.includes("Иванов Петр Николаевич"));
		assert.ok(html.includes("Папа • 38 лет"));
		assert.ok(html.includes("Умеренный риск кариеса"));
		assert.ok(html.includes("Просрочено"));

		// Child (High risk)
		assert.ok(html.includes("Иванов Михаил Петрович"));
		assert.ok(html.includes("Сын (Ребёнок) • 7 лет"));
		assert.ok(html.includes("Высокий риск кариеса (CAMBRA Pediatric)"));
		assert.ok(html.includes("Сменный прикус"));

		// Teenager
		assert.ok(html.includes("Иванова София Петровна"));
		assert.ok(html.includes("Дочь (Подросток) • 12 лет"));
	});

	it("renders parallel booking tab and discounts when rendered with parallel active tab", () => {
		const html = renderToString(
			<FamilyDentalCareHubWidget data={DEFAULT_PRESET_FAMILY_CARE_HUB} />,
		);

		assert.ok(html.includes("Параллельный приём (-10%)"));
		assert.ok(html.includes("Члены семьи (4)"));
	});

	it("renders custom family dental care hub data accurately", () => {
		const customData: FamilyDentalCareHubData = {
			familyId: "fam-custom-99",
			familyName: "Семья Кузнецовых",
			familyHygieneScorePercent: 95,
			nextFamilyCheckupDateRu: "01 декабря 2026",
			members: [
				{
					id: "pat-custom-1",
					fullName: "Кузнецов Дмитрий Олегович",
					relationshipLabelRu: "Глава семьи",
					ageYears: 42,
					isMinor: false,
					lastHygieneDateRu: "01 июня 2026",
					nextHygieneDueRu: "01 декабря 2026",
					daysUntilNextHygiene: 90,
					hygieneCycleMonths: 6,
					cambraRisk: "low",
					cambraRiskLabelRu: "Низкий риск",
					cambraScore: 1,
					cambraFactorsRu: ["Регулярный уход"],
					primaryDoctorRu: "Д-р Кузнецов",
					status: "on_track",
				},
			],
			parallelPackages: [],
		};

		const html = renderToString(
			<FamilyDentalCareHubWidget data={customData} />,
		);

		assert.ok(html.includes("Семья Кузнецовых"));
		assert.ok(html.includes("Индекс защиты семьи 95%"));
		assert.ok(html.includes("Кузнецов Дмитрий Олегович"));
		assert.ok(html.includes("Глава семьи • 42 лет"));
		assert.ok(html.includes("01 декабря 2026"));
	});
});
