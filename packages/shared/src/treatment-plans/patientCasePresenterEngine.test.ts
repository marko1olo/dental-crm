import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	generatePatientCasePresentation,
	humanizeDentalText,
	type PatientCasePresenterInput,
} from "./patientCasePresenterEngine.js";

describe("patientCasePresenterEngine (AI Patient Case Presenter)", () => {
	it("переводит врачебный жаргон на понятный человеческий язык", () => {
		const jargonText = "Пациенту показан открытый синус-лифтинг и остеоинтеграция импланта";
		const translated = humanizeDentalText(jargonText);

		assert.ok(translated.includes("Бережное наращивание кости"));
		assert.ok(translated.includes("фундамент"));
	});

	it("генерирует 3 понятных слайда презентации из сложного клинического плана", () => {
		const input: PatientCasePresenterInput = {
			patientFullName: "Иванов Алексей Петрович",
			doctorFullName: "Др. Соколов Михаил",
			clinicName: "DENTE Премиум",
			clinicPhone: "+7 (495) 123-45-67",
			planTitle: "Тотальное восстановление жевательной зоны",
			patientMainConcern: "Больно жевать слева, разрушились старые зубы",
			installmentAvailable: true,
			maxInstallmentMonths: 12,
			items: [
				{
					code: "A16.07.002",
					name: "Лечение кариеса и пломба 2.4",
					category: "therapy",
					tooth: 24,
					priceRub: 6_500,
					quantity: 1,
				},
				{
					code: "A16.07.054",
					name: "Имплантация Nobel Biocare 2.6",
					category: "surgery_implant",
					tooth: 26,
					priceRub: 65_000,
					quantity: 1,
				},
				{
					code: "A16.07.041",
					name: "Открытый синус-лифтинг в области 2.6",
					category: "surgery_implant",
					tooth: 26,
					priceRub: 45_000,
					quantity: 1,
				},
				{
					code: "A16.07.004",
					name: "Коронка диоксид циркония на импланте 2.6",
					category: "prosthetics",
					tooth: 26,
					priceRub: 48_000,
					quantity: 1,
				},
			],
		};

		const pres = generatePatientCasePresentation(input);

		// Общая валидность
		assert.ok(pres.presentationId.startsWith("case_"));
		assert.equal(pres.shareToken.length, 8);
		assert.equal(pres.patientDisplayName, "Иванов Алексей");
		assert.equal(pres.clinicName, "DENTE Премиум");

		// Слайд 1: Диагностика
		const d = pres.slides.diagnosis;
		assert.equal(d.slideType, "diagnosis");
		assert.ok(d.summaryRu.includes("Больно жевать слева"));
		assert.ok(d.bulletPointsRu.some((b) => b.includes("костная ткань постепенно истончается")));

		// Слайд 2: Риски бездействия
		const r = pres.slides.risks;
		assert.equal(r.slideType, "risks");
		assert.equal(r.timelineProgression.length, 3);
		// Общая сумма: 6.5к + 65к + 45к + 48к = 164 500 ₽
		// Эскалация затрат при затягивании: 164 500 * 1.45 ≈ 238 525 ₽
		assert.equal(r.escalatedCostEstimateRub, 238525);
		assert.ok(r.timelineProgression[2]?.clinicalConsequenceRu.includes("Попова-Годона"));

		// Слайд 3: Пошаговый маршрут и рассрочка
		const m = pres.slides.roadmap;
		assert.equal(m.slideType, "roadmap");
		assert.equal(m.totalPlanCostRub, 164_500);
		// 3 этапа: санация, хирургия, ортопедия
		assert.equal(m.stages.length, 3);
		assert.equal(m.stages[0]?.costRub, 6_500);
		assert.equal(m.stages[1]?.costRub, 110_000); // 65к + 45к
		assert.equal(m.stages[2]?.costRub, 48_000);

		// Рассрочка на 12 мес: 164 500 / 12 ≈ 13 708 ₽/мес
		assert.equal(m.monthlyPaymentEstimateRub, 13708);
		assert.match(m.installmentOfferRu ?? "", /13[\s\u00A0\u202F]708/);
	});
});
