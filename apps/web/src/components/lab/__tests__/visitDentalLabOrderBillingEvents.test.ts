import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	calculateLabFinancialSplit,
	type DentalLabOrderData,
} from "../labMath";
import { LabOrdersTableRow } from "../ordersView/LabOrdersTableRow";
import {
	parseBillingServicesList,
	parseSingleBillingItem,
} from "../../visit/billing/billingEventItemParser";
import { VisitServiceBillingWidget } from "../../visit/VisitServiceBillingWidget";
import { useVisitStore } from "../../../store/visitStore";

describe("visitDentalLabOrder — Billing, Events & Codebase Wiring", () => {
	beforeEach(() => {
		useVisitStore.getState().resetDraft();
	});

	afterEach(() => {
		useVisitStore.getState().resetDraft();
	});

	it("Снятие слепка (A02.07.010) парсится и отображается в биллинге визита", () => {
		const parsed = parseSingleBillingItem({
			code804n: "A02.07.010",
			title: "Снятие слепка (оттиска) с одной челюсти",
			priceRub: 2500,
			quantity: 1,
			toothNumber: 26,
		});

		assert.equal(parsed.code804n, "A02.07.010");
		assert.equal(parsed.unitPriceRub, 2500);
		assert.equal(parsed.toothCode, "26");

		const html = renderToStaticMarkup(
			React.createElement(VisitServiceBillingWidget, {
				visitId: "visit-lab-1",
				patientId: "pat-123",
				initialServices: [parsed],
			}),
		);

		assert.ok(html.includes("Снятие слепка (оттиска) с одной челюсти"));
		assert.ok(html.includes("A02.07.010"));
		assert.ok(html.includes("2\u00a0500") || html.includes("2 500"));
	});

	it("Добавление наряда ЗТЛ и слепка обновляет store визита и копеечный сплит", () => {
		const parsedList = parseBillingServicesList([
			{
				code804n: "A16.07.004",
				title: "Коронка ZrO2",
				toothCode: "26",
				priceKopecks: 1850000,
				labCostRub: 7500,
				labOrderId: "lab-xyz",
				quantity: 1,
			},
			{
				code804n: "A02.07.010",
				title: "Снятие оттиска с челюсти",
				toothCode: "26",
				priceRub: 2500,
				quantity: 1,
			},
		]);

		assert.equal(parsedList.length, 2);
		assert.equal(parsedList[0]?.unitPriceRub, 18500);
		assert.equal(parsedList[0]?.labCostRub, 7500);

		for (const item of parsedList) {
			useVisitStore.getState().addCompletedService({
				serviceId: item.id,
				code804n: item.code804n,
				toothCode: item.toothCode,
				name: item.title,
				priceRub: item.unitPriceRub,
				quantity: item.quantity,
				...(item.labCostRub ? { labCostRub: item.labCostRub } : {}),
				...(item.labOrderId ? { labOrderId: item.labOrderId } : {}),
			});
		}

		const completed = useVisitStore.getState().completedServices;
		assert.equal(completed.length, 2);
		assert.equal(completed[0]?.code804n, "A16.07.004");
		assert.equal(completed[1]?.code804n, "A02.07.010");

		const split = calculateLabFinancialSplit(18500, 40);
		assert.equal(split.isBalanced, true);
		assert.equal(split.totalKopecks, 1850000);
	});

	it("LabOrdersTableRow рендерит номер этапа плана лечения и данные заказа ЗТЛ", () => {
		const order: DentalLabOrderData = {
			id: "lab-order-303",
			orderNumber: "ЗТЛ-0303",
			patientId: "pat-123",
			patientName: "Смирнова Е.В.",
			toothFdi: "26",
			constructionType: "Коронка полная анатомическая",
			material: "Диоксид циркония (ZrO2)",
			colorVita: "A2",
			status: "in_lab",
			priceRub: 18500,
			treatmentPlanId: "plan-999",
			stageNumber: 3,
			includeImpressionBilling: true,
		};

		const html = renderToStaticMarkup(
			React.createElement(
				"table",
				null,
				React.createElement(
					"tbody",
					null,
					React.createElement(LabOrdersTableRow, {
						order,
						openMenuOrderId: null,
						setOpenMenuOrderId: () => {},
						onSelectTimelineOrder: () => {},
						onOpenReadyInClinicPrompt: () => {},
						onOpenTracking: () => {},
						getStatusBadge: (status) => React.createElement("span", null, status || "draft"),
						onView3DScan: () => {},
						onPayFromCashbox: () => {},
						onMarkInstalled: () => {},
						onAttach3DScan: () => {},
						onAttachBitePhoto: () => {},
						onTechnicianComment: () => {},
						onOpenPrintOrder: () => {},
						onRepeatFitting: () => {},
						onReclamation: () => {},
						onOpenEditOrder: () => {},
						copyPortalLink: () => {},
					}),
				),
			),
		);

		assert.ok(html.includes('data-testid="lab-order-table-row-lab-order-303"'));
		assert.ok(html.includes("Этап 3"), "Таблица ЗТЛ обязана отображать бейдж этапа плана лечения");
		assert.ok(html.includes("Смирнова Е.В."));
		assert.ok(html.includes("№ 26"));
		assert.ok(html.includes("A2"));
	});

	it("VisitServiceBillingWidget отображает бейдж лабораторной себестоимости и скрывает его при нуле", () => {
		const htmlWithLabCost = renderToStaticMarkup(
			React.createElement(VisitServiceBillingWidget, {
				visitId: "visit-lab-cost-1",
				patientId: "pat-real-1",
				initialServices: [
					{
						id: "svc-crown-1",
						code804n: "A16.07.004",
						title: "Коронка диоксид циркония",
						toothCode: "36",
						quantity: 1,
						unitPriceRub: 22000,
						discountPercent: 0,
						discountRub: 0,
						isWarranty: false,
						labCostRub: 7500,
					},
				],
			}),
		);

		assert.ok(htmlWithLabCost.includes('data-testid="badge-total-lab-cost"'));
		assert.ok(htmlWithLabCost.includes("7500"));

		const htmlWithoutLabCost = renderToStaticMarkup(
			React.createElement(VisitServiceBillingWidget, {
				visitId: "visit-lab-cost-2",
				patientId: "pat-real-2",
				initialServices: [
					{
						id: "svc-consult-1",
						code804n: "B01.065.001",
						title: "Консультация",
						quantity: 1,
						unitPriceRub: 1500,
						discountPercent: 0,
						discountRub: 0,
						isWarranty: false,
					},
				],
			}),
		);

		assert.ok(!htmlWithoutLabCost.includes('data-testid="badge-total-lab-cost"'));
	});
});
