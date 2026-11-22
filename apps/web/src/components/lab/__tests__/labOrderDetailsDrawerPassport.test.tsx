import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { LabOrderDetailsDrawer } from "../ordersView/LabOrderDetailsDrawer";
import type { DentalLabOrderData } from "../dentalLabDefinitions";

describe("LabOrderDetailsDrawer — Warranty Passport Integration for Installed Orders (Defect 5)", () => {
	const sampleInstalledOrder: DentalLabOrderData = {
		id: "0192e2b0-8451-789a-bcde-000000000001",
		patientId: "patient-1",
		patientName: "Алексеев А. А.",
		doctorId: "doctor-1",
		doctorName: "Д-р Ортопедов",
		secureToken: "ZTL-TOKEN-INSTALLED",
		orderNumber: "ЗТЛ-2611-0001",
		constructionType: "Коронка циркониевая",
		material: "Диоксид циркония ZrO2 Multilayer",
		colorVita: "A2",
		status: "installed",
		stage: "ready_fixation",
		priceRub: 35000,
		labCostRub: 9000,
		isLockedInstalled: true,
		createdAt: "2026-11-20T10:00:00Z",
	};

	it("рендерит кнопку «Гарантийный паспорт» для наряда со статусом installed при открытой шторке", () => {
		const html = renderToString(
			<LabOrderDetailsDrawer
				isOrderDrawerOpen={true}
				onCloseOrderDrawer={() => {}}
				selectedOrderForEdit={sampleInstalledOrder}
				isPriceMatrixModalOpen={false}
				onClosePriceMatrixModal={() => {}}
				onSelectWorkType={() => {}}
				view3DScanOrder={null}
				onClose3DScanViewer={() => {}}
				onOrderSaved={() => {}}
			/>,
		);

		assert.ok(
			html.includes("Гарантийный паспорт"),
			"Кнопка «Гарантийный паспорт» должна присутствовать в разметке шторки для наряда со статусом installed",
		);
		assert.ok(
			html.includes("lab-order-installed-warranty-passport-btn"),
			"Кнопка должна иметь data-testid='lab-order-installed-warranty-passport-btn'",
		);
	});

	it("рендерит кнопку «Гарантийный паспорт» в футере LabTrackingDrawer при трекинге установленного наряда", () => {
		const html = renderToString(
			<LabOrderDetailsDrawer
				isTrackingDrawerOpen={true}
				onCloseTrackingDrawer={() => {}}
				selectedOrderForTracking={sampleInstalledOrder}
				selectedOrderForEdit={null}
				isPriceMatrixModalOpen={false}
				onClosePriceMatrixModal={() => {}}
				onSelectWorkType={() => {}}
				view3DScanOrder={null}
				onClose3DScanViewer={() => {}}
				onOrderSaved={() => {}}
			/>,
		);

		assert.ok(
			html.includes("Гарантийный паспорт"),
			"Кнопка «Гарантийный паспорт» должна присутствовать в футере трекинга установленного наряда",
		);
		assert.ok(
			html.includes("lab-order-warranty-passport-btn"),
			"Кнопка должна иметь data-testid='lab-order-warranty-passport-btn'",
		);
	});

	it("не отображает кнопку «Гарантийный паспорт» для наряда в производстве (draft / sent / in_progress)", () => {
		const inProgressOrder: DentalLabOrderData = {
			...sampleInstalledOrder,
			id: "0192e2b0-8451-789a-bcde-000000000002",
			status: "in_progress",
			stage: "cad_modeling",
			isLockedInstalled: false,
		};

		const html = renderToString(
			<LabOrderDetailsDrawer
				isTrackingDrawerOpen={true}
				onCloseTrackingDrawer={() => {}}
				selectedOrderForTracking={inProgressOrder}
				selectedOrderForEdit={null}
				isPriceMatrixModalOpen={false}
				onClosePriceMatrixModal={() => {}}
				onSelectWorkType={() => {}}
				view3DScanOrder={null}
				onClose3DScanViewer={() => {}}
				onOrderSaved={() => {}}
			/>,
		);

		assert.ok(
			!html.includes("lab-order-warranty-passport-btn"),
			"Кнопка гарантийного паспорта НЕ должна отображаться для наряда в производстве",
		);
	});
});
