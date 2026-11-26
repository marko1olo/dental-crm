import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	calculateLiveInvoiceItems,
	ORDER_804N_PROCEDURES,
	resolveClinicProcedureForState,
} from "../odontogram/odontogramLiveInvoiceCalculations";
import { buildPlanBudgetText } from "../treatment-plans/treatmentPlanMessengerHelper";
import { VisitEmkCompletionSection } from "../visit/emkTab/VisitEmkCompletionSection";
import type { ToothData } from "../odontogram/ToothChart";
import type { TreatmentPlanTier } from "../treatment-plans/treatmentPlanTypes";

test("calculateLiveInvoiceItems uses real clinic serviceCatalog prices and titles with fallback to ORDER_804N_PROCEDURES", () => {
	const teeth: ToothData[] = [
		{ toothNumber: 16, state: "Caries" },
		{ toothNumber: 26, state: "Crown" },
	];

	const cariesCode = ORDER_804N_PROCEDURES.Caries1Surface?.code ?? "A16.07.002.001";
	const items = calculateLiveInvoiceItems(teeth, {
		clinicServiceCatalog: [
			{
				order804nCode: cariesCode,
				code: "TER-CARIES-1",
				title: "Эстетическая реставрация кариеса (прайс клиники)",
				priceKopecks: 790000,
				basePriceRub: 7900,
				active: true,
			},
			{
				order804nCode: ORDER_804N_PROCEDURES.Crown?.code ?? "",
				code: "ORTHO-INACTIVE",
				title: "Неактивная позиция",
				priceKopecks: 9999900,
				active: false,
			},
		],
	});

	const cariesItem = items.find((i) => i.toothNumber === 16);
	assert.ok(cariesItem, "Tooth 16 caries item must exist");
	assert.equal(cariesItem.price, 7900);
	assert.equal(cariesItem.amountKopecks, 790000);
	assert.ok(cariesItem.title.includes("Эстетическая реставрация кариеса (прайс клиники)"));

	const crownItem = items.find((i) => i.toothNumber === 26);
	assert.ok(crownItem, "Tooth 26 crown item must fall back when catalog entry is inactive or absent");
	assert.equal(crownItem.amountKopecks, ORDER_804N_PROCEDURES.Crown?.amountKopecks);

	const resolvedQuick = resolveClinicProcedureForState("Caries", [
		{
			order804nCode: ORDER_804N_PROCEDURES.Caries?.code,
			title: "Лечение кариеса по прайсу",
			basePriceRub: 6250,
			active: true,
		},
	]);
	assert.equal(resolvedQuick?.price, 6250);
	assert.equal(resolvedQuick?.amountKopecks, 625000);
});

test("buildPlanBudgetText embeds interactive public share URL cleanly without dev jargon", () => {
	const tier: TreatmentPlanTier = {
		tierId: "optimum",
		title: "Оптимум",
		badge: "★ Оптимум",
		warrantyYears: 3,
		serviceLifeYears: 10,
		totalRub: 120000,
		grossTotalRub: 120000,
		discountRub: 0,
		totalKopecks: 12000000,
		itemsCount: 2,
		durationVisits: 2,
		durationWeeks: 2,
		stages: [
			{
				stageId: "stg-1",
				title: "Терапевтическая санация",
				estimatedWeeks: 1,
				totalRub: 45000,
				items: [],
			},
		],
	};

	const msg = buildPlanBudgetText(tier, "https://clinic.dente.ru/portal/budget/tok-123");
	assert.ok(msg.includes("https://clinic.dente.ru/portal/budget/tok-123"));
	assert.ok(!msg.toLowerCase().includes("1 клик"));
});

test("VisitEmkCompletionSection renders doctor earnings delta and today total in tabular monospace", () => {
	const html = renderToStaticMarkup(
		React.createElement(VisitEmkCompletionSection, {
			isSignedVisit: true,
			isRevisingVisitNote: false,
			setIsRevisingVisitNote: () => {},
			handleSaveVisitNote: () => {},
			handleCompleteVisitAndGenerateReceipt: () => {},
			isDraftAccepting: false,
			isCompletingVisit: false,
			completionResult: {
				visitId: "v-1",
				patientId: "p-1",
				patientName: "Анна И.",
				doctorName: "Д-р Соколов",
				totalGrossRub: 10000,
				totalDiscountRub: 0,
				totalNetRub: 10000,
				totalNetKop: 1000000,
				items: [],
				status: "completed",
				statusBannerText: "Готово",
				sbpQrUrl: "",
				sbpQrPayload: "",
				form043uSaved: true,
				completedAtIso: new Date().toISOString(),
				receiptNumber: "Ч-001",
				doctorEarningsDeltaKopecks: 250000,
				doctorTodayTotalKopecks: 1480000,
			},
			completionError: null,
			setIsSbpQrModalOpen: () => {},
			activeEmkTab: "diary",
			setActiveEmkTab: () => {},
		}),
	);

	assert.ok(html.includes('data-testid="visit-completion-doctor-earnings"'));
	assert.ok(html.includes("2") && html.includes("500"));
	assert.ok(html.includes("14") && html.includes("800"));
	assert.ok(!html.toLowerCase().includes("1 клик"));
});
