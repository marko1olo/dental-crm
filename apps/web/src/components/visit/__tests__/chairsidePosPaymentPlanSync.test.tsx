import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitSummaryModal } from "../VisitSummaryModal";
import { TreatmentPlanRoadmap, type RoadmapStageData } from "../../treatment-plans/TreatmentPlanRoadmap";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";

describe("Chairside POS Checkout & Cashier Plan Sync Inquisitor", () => {
	const mockPatient = {
		id: "pat-chairside-001",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (999) 111-22-33",
		cardNumber: "K-10492",
		birthDate: "1988-04-12",
		depositRub: 5000,
		balanceRub: 5000,
	};

	const mockDiary = {
		complaints: "Острая боль в области зуба 36",
		anamnesis: "Заболел 2 дня назад",
		statusLocalis: "Кариозная полость на жевательной поверхности",
		diagnosis: "К02.1 Кариес дентина 36",
		treatmentDescription: "Препарирование, пломба светового отверждения",
		diagnosisIcd10: "K02.1",
		diagnosisTooth: "36",
		complications: "",
		comorbidities: "",
	};

	it("1. VisitSummaryModal renders prominent chairside POS block with rubles without kopeck drift", () => {
		const html = renderToStaticMarkup(
			createElement(
				AppLogicProvider,
				{
					value: {
						activeVisitId: "visit-test-1",
						activeDoctor: { fullName: "Д-р Смирнова А.В.", specialties: ["Терапевт"] },
						dashboard: {
							activeVisit: { id: "visit-test-1", completedServices: [] },
							clinicSettings: { legalName: "ООО «ДЕНТЕ»" },
						},
					} as any,
				},
				createElement(VisitSummaryModal, {
					isOpen: true,
					onClose: () => {},
					patient: mockPatient,
					diary: mockDiary,
					doctorName: "Д-р Смирнова А.В.",
					totalDueRub: 4500,
					patientDepositRub: 5000,
					isPaid: false,
					defaultDocsDropupOpen: true,
				}),
			),
		);

		// 1. Chairside POS block presence
		const normalizedHtml = html.replace(/[\u00a0\u202f\s]+/g, " ");
		assert.ok(normalizedHtml.includes("chairside-pos-block"), "Renders chairside-pos-block");
		assert.ok(normalizedHtml.includes("Оплата приёма в кресле"), "Shows clean clinical title 'Оплата приёма в кресле'");
		assert.ok(normalizedHtml.includes("chairside-total-due"), "Renders chairside-total-due element");
		assert.ok(normalizedHtml.includes("4 500 ₽"), "Displays total amount in rubles without kopeck drift: '4 500 ₽'");

		// 2. 1-click Quick Tender Buttons
		assert.ok(normalizedHtml.includes("chairside-pay-sbp-qr-btn"), "Renders SBP QR payment button");
		assert.ok(normalizedHtml.includes("Оплатить по QR (СБП)"), "Button text has human SBP label");
		assert.ok(normalizedHtml.includes("chairside-pay-card-btn"), "Renders Bank Card button");
		assert.ok(normalizedHtml.includes("Банковская карта"), "Button text has Bank Card label");
		assert.ok(normalizedHtml.includes("chairside-pay-deposit-btn"), "Renders Patient Deposit button");
		assert.ok(normalizedHtml.includes("Списать с депозита"), "Button text has Deposit debit label");
		assert.ok(normalizedHtml.includes("5 000 ₽"), "Displays available patient deposit balance");

		// 3. Footer quick pay button
		assert.ok(normalizedHtml.includes("summary-quick-pay-btn"), "Renders quick pay in footer");
		assert.ok(normalizedHtml.includes("Оплата приёма (4 500 ₽)"), "Footer button shows total sum");
	});

	it("2. VisitSummaryModal renders paid state with issued receipt confirmation and zero bird language", () => {
		const html = renderToStaticMarkup(
			createElement(
				AppLogicProvider,
				{
					value: {
						activeVisitId: "visit-test-1",
						dashboard: {
							activeVisit: { id: "visit-test-1" },
							clinicSettings: { legalName: "ООО «ДЕНТЕ»" },
						},
					} as any,
				},
				createElement(VisitSummaryModal, {
					isOpen: true,
					onClose: () => {},
					patient: mockPatient,
					diary: mockDiary,
					doctorName: "Д-р Смирнова А.В.",
					totalDueRub: 4500,
					isPaid: true,
					defaultDocsDropupOpen: true,
				}),
			),
		);

		assert.ok(html.includes("chairside-paid-badge"), "Renders chairside-paid-badge when paid");
		assert.ok(html.includes("Чек выдан"), "Displays 'Чек выдан' status badge");
		assert.ok(html.includes("Оплата приёма принята"), "Displays confirmation 'Оплата приёма принята'");
		assert.ok(html.includes("summary-paid-indicator"), "Renders paid indicator in footer");

		// Strict Ban on Bird Language (Mandate 8x & System Directive)
		assert.ok(!html.includes("54-ФЗ"), "UI must not contain regulatory code '54-ФЗ'");
		assert.ok(!html.includes("ФФД 1.2"), "UI must not contain bureaucratic code 'ФФД 1.2'");
		assert.ok(!html.includes("Мандат 8e"), "UI must not contain dev jargon 'Мандат 8e'");
		assert.ok(!html.includes("ККТ"), "UI must not contain hardware abbreviation 'ККТ'");
		assert.ok(!html.includes("ОФД"), "UI must not contain technical term 'ОФД'");
		assert.ok(!html.includes("Печать карты 043/у"), "Button must use human title 'Печать медицинской карты' instead of '043/у'");
	});

	it("3. TreatmentPlanRoadmap renders [✓ ОПЛАЧЕНО 100%] badge and remaining 0,00 ₽ for completed stages", () => {
		const mockCompletedStages: RoadmapStageData[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_emergency",
				titleRu: "Этап 1: Неотложная помощь и снятие боли",
				subtitleRu: "Купирование острой боли и первичная санация",
				patientGoalRu: "Устранить боль и воспаление",
				timelineRu: "1 визит",
				preparationRu: "Без подготовки",
				warrantyRu: "Гарантия 1 год",
				status: "completed",
				teethFdiList: ["36"],
				procedures: [
					{
						id: "proc-1",
						medicalTitleRu: "Препарирование кариозной полости",
						patientFriendlyTitleRu: "Лечение кариеса",
						priceRub: 4500,
						priceKopecks: 450000,
						quantity: 1,
						isCompleted: true,
					},
				],
				totalRub: 4500,
				totalKopecks: 450000,
				completedRub: 4500,
				completedKopecks: 450000,
				remainingRub: 0,
				remainingKopecks: 0,
				estimatedVisitsCount: 1,
				isFullyPaid: true,
			},
			{
				stageNumber: 2,
				stageKind: "stage_2_therapy",
				titleRu: "Этап 2: Терапевтическая санация",
				subtitleRu: "Лечение зубов",
				patientGoalRu: "Вылечить все зубы",
				timelineRu: "2 визита",
				preparationRu: "Без подготовки",
				warrantyRu: "Гарантия 1 год",
				status: "planned",
				teethFdiList: ["14"],
				procedures: [
					{
						id: "proc-2",
						medicalTitleRu: "Пломбирование",
						patientFriendlyTitleRu: "Пломба",
						priceRub: 5000,
						priceKopecks: 500000,
						quantity: 1,
						isCompleted: false,
					},
				],
				totalRub: 5000,
				totalKopecks: 500000,
				completedRub: 0,
				completedKopecks: 0,
				remainingRub: 5000,
				remainingKopecks: 500000,
				estimatedVisitsCount: 1,
			},
		];

		const html = renderToStaticMarkup(
			createElement(TreatmentPlanRoadmap, {
				customRoadmapStages: mockCompletedStages,
				planTitle: "Комплексный план лечения",
				planNumber: "PLN-882",
				patientFullName: "Иванов И.И.",
			}),
		);

		// 1. Header status badge
		assert.ok(html.includes("stage-paid-badge-1"), "Renders stage-paid-badge-1 in stage header");
		assert.ok(html.includes("✓ ОПЛАЧЕНО 100%"), "Displays exact '✓ ОПЛАЧЕНО 100%' badge in header");

		// 2. Footer completed badge
		assert.ok(html.includes("stage-paid-footer-badge-1"), "Renders stage-paid-footer-badge-1 in stage footer");

		// 3. Exact remaining cost
		assert.ok(html.includes("stage-remaining-cost-1"), "Renders stage-remaining-cost-1 element");
		assert.ok(html.includes("Остаток к оплате: 0,00 ₽"), "Displays 'Остаток к оплате: 0,00 ₽'");

		// 4. Planned stage 2 should NOT have paid badge
		assert.ok(!html.includes("stage-paid-badge-2"), "Planned stage 2 does not have stage-paid-badge-2");
	});

	it("4. TreatmentPlanRoadmap maintains pure clinical language without bureaucratic codes", () => {
		const html = renderToStaticMarkup(
			createElement(TreatmentPlanRoadmap, {
				stages: [
					{
						stageNumber: 1,
						stageKind: "stage_1_therapy" as any,
						title: "Терапевтический этап",
						subtitle: "Лечение кариеса",
						items: [
							{
								id: "it-1",
								code804n: "A16.07.002",
								name: "Восстановление зуба",
								priceRub: 3500,
								quantity: 1,
								isCompleted: true,
							} as any,
						],
						totalRub: 3500,
						totalKopecks: 350000 as any,
						status: "completed",
					} as any,
				],
			}),
		);

		assert.ok(html.includes("✓ ОПЛАЧЕНО 100%"), "Completed standard stage shows ✓ ОПЛАЧЕНО 100%");
		assert.ok(html.includes("Остаток к оплате: 0,00 ₽"), "Completed standard stage shows Остаток к оплате: 0,00 ₽");
		assert.ok(!html.includes("54-ФЗ"), "Roadmap must not contain 54-ФЗ");
		assert.ok(!html.includes("ФФД 1.2"), "Roadmap must not contain ФФД 1.2");
	});
});
