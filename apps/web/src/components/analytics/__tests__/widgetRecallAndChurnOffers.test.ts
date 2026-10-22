/**
 * apps/web/src/components/analytics/__tests__/widgetRecallAndChurnOffers.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock recall cohorts, churn risk & offer generation.
 * Mandate 8ap & 8x: Clean domain language, normalized visits/payments without note-parsing regexes.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateRecallRates,
	classifyChurnRisk,
	formatDoctorGenitive,
	generatePersonalizedOffer,
} from "../analyticsWidgetData.js";

test("когортный анализ возвращаемости корректно вычисляет проценты и статусы", () => {
	const cohortGood = calculateRecallRates(100, 72, 68);
	assert.equal(cohortGood.rate6m, 72);
	assert.equal(cohortGood.rate12m, 68);
	assert.equal(cohortGood.healthTone, "ok");

	const cohortWarn = calculateRecallRates(50, 26, 20);
	assert.equal(cohortWarn.rate6m, 52);
	assert.equal(cohortWarn.rate12m, 40);
	assert.equal(cohortWarn.healthTone, "warn");

	const cohortBad = calculateRecallRates(80, 16, 8);
	assert.equal(cohortBad.rate6m, 20);
	assert.equal(cohortBad.rate12m, 10);
	assert.equal(cohortBad.healthTone, "bad");

	const cohortZero = calculateRecallRates(0, 0, 0);
	assert.equal(cohortZero.rate6m, 0);
	assert.equal(cohortZero.rate12m, 0);
	assert.equal(cohortZero.healthTone, "bad");
});

test("классификация риска оттока делит пациентов по срокам и профилю лечения", () => {
	const risk6m = classifyChurnRisk(190, "sanitation");
	assert.equal(risk6m.band, "due_6m");
	assert.equal(risk6m.badgeTone, "ok");
	assert.match(risk6m.recommendedService, /Air-Flow/);

	const risk12mImp = classifyChurnRisk(400, "implantation");
	assert.equal(risk12mImp.band, "overdue_12m");
	assert.equal(risk12mImp.badgeTone, "warn");
	assert.match(risk12mImp.recommendedService, /КТ-контроль|остеоинтеграции/);

	const risk24m = classifyChurnRisk(800, "general_therapy");
	assert.equal(risk24m.band, "critical_24m");
	assert.equal(risk24m.badgeTone, "bad");
});

test("генератор персональных предложений формирует корректный текст обращения и ФИО", () => {
	const offerImp = generatePersonalizedOffer({
		patientName: "Смирнова Елена Александровна",
		clinicName: "Дент-Премиум",
		daysSinceLastVisit: 380,
		category: "implantation",
		doctorName: "Барабаш С.В.",
	});

	assert.match(offerImp.messageText, /Елена Александровна/);
	assert.match(offerImp.messageText, /Дент-Премиум/);
	assert.match(offerImp.messageText, /имплантации/);
	assert.match(offerImp.messageText, /Барабаш С\.В\./);
	assert.equal(offerImp.channelSuggestions.includes("whatsapp"), true);

	const offerDoctorSan = generatePersonalizedOffer({
		patientName: "Барабаш Сергей Владимирович",
		clinicName: "Стоматология Дент-Премиум",
		daysSinceLastVisit: 195,
		category: "sanitation",
		doctorName: "Смирнов А.П.",
	});

	assert.match(offerDoctorSan.messageText, /Сергей Владимирович/);
	assert.match(offerDoctorSan.messageText, /у д-ра Смирнова А\.П\./);
	assert.equal(offerDoctorSan.messageText.includes(".."), false);

	const offerDocWoman = generatePersonalizedOffer({
		patientName: "Ковалёва Анна Игоревна",
		clinicName: "Стоматология Дент-Премиум",
		daysSinceLastVisit: 215,
		category: "sanitation",
		doctorName: "Ковалёва А.И.",
	});
	assert.match(offerDocWoman.messageText, /у д-ра Ковалёвой А\.И\./);
	assert.equal(offerDocWoman.messageText.includes(".."), false);
});

test("функция formatDoctorGenitive корректно склоняет фамилии врачей", () => {
	assert.equal(formatDoctorGenitive("Смирнов А.П."), "Смирнова А.П.");
	assert.equal(formatDoctorGenitive("Ковалёва А.И."), "Ковалёвой А.И.");
	assert.equal(formatDoctorGenitive("Белый И.С."), "Белого И.С.");
	assert.equal(formatDoctorGenitive(""), "");
});
