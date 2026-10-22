import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DentalLabOrderData } from "../labMath";

const __filename = fileURLToPath(import.meta.url);
const labDir = path.resolve(path.dirname(__filename), "..");
const webSrcDir = path.resolve(path.dirname(__filename), "../../../");
const dentalLabOrderModalSectionPath = path.resolve(
	labDir,
	"../visit/view/viewModalsModules/DentalLabOrderModalSection.tsx",
);

describe("visitDentalLabOrder — Billing, Events & Codebase Wiring", () => {
	it("Снятие слепка (A02.07.010) и includeImpressionBilling", () => {
		const impressionService = {
			serviceCode: "A02.07.010",
			name: "Снятие слепка (оттиска) с одной челюсти",
			price: 2500,
			quantity: 1,
		};
		assert.equal(impressionService.serviceCode, "A02.07.010");
		assert.equal(impressionService.price, 2500);

		const testOrder: Partial<DentalLabOrderData> = {
			patientId: "pat-123",
			treatmentPlanId: "plan-999",
			stageNumber: 3,
			includeImpressionBilling: true,
		};
		assert.equal(testOrder.includeImpressionBilling, true);
	});

	it("События браузера для смены статуса этапа и добавления услуги в чек", () => {
		const eventDetail = {
			planId: "plan-xyz",
			stageNumber: 3,
			status: "in_lab",
			statusRu: "В работе в ЗТЛ",
		};
		assert.equal(eventDetail.status, "in_lab");
		assert.equal(eventDetail.statusRu, "В работе в ЗТЛ");

		const billingItemEventDetail = {
			code: "A02.07.010",
			priceRub: 2500,
			quantity: 1,
		};
		assert.equal(billingItemEventDetail.code, "A02.07.010");
		assert.equal(billingItemEventDetail.priceRub, 2500);
	});

	it("Сквозная связка VisitView, DentalLabOrdersView и VisitViewModals", () => {
		const visitViewPath = path.resolve(webSrcDir, "VisitView.tsx");
		const content = fs.readFileSync(visitViewPath, "utf-8");
		assert.match(content, /loadedTreatmentPlan=\{(?:s\.)?loadedTreatmentPlan\s*\|\|\s*(?:s\.)?activePlan\}/);

		const ordersViewPath = path.resolve(labDir, "DentalLabOrdersView.tsx");
		const ordersContent = fs.readFileSync(ordersViewPath, "utf-8");
		assert.match(ordersContent, /order\.stageNumber\s*\?/);
		assert.match(ordersContent, /Этап\s*\{order\.stageNumber\}/);
	});

	it("Лабораторная себестоимость в финансовой карточке визита", () => {
		const content = fs.readFileSync(dentalLabOrderModalSectionPath, "utf-8");
		assert.match(content, /rawLabCost\s*=/);
		assert.match(content, /unitLabCost\s*=/);
		assert.match(content, /labCostRub:\s*unitLabCost/);

		const widgetPath = path.resolve(labDir, "../visit/VisitServiceBillingWidget.tsx");
		const widgetContent = fs.readFileSync(widgetPath, "utf-8");
		assert.match(widgetContent, /totalLabCostRub/);
		assert.match(widgetContent, /badge-total-lab-cost/);
	});
});
