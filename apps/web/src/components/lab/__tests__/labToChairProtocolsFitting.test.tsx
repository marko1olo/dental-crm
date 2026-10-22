import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OrthopedicsChairsidePanel } from "../../orthopedics/OrthopedicsChairsidePanel.js";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	applyOrthopedicProtocolToVisit,
} from "../../orthopedics/orthopedicProtocols.js";
import { ChairsideBillingItemRow } from "../../visit/ChairsideBillingItemRow.js";

describe("labToChairProtocolsFitting — Protocols & Chairside Fitting", () => {
	it("1. Авто-привязка заказа к протоколу приёма ортопеда (услуга A16.07.004)", () => {
		const cementProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find(
			(p) => p.id === "ortho_permanent_cementation",
		)!;
		const dispatched: Array<{ type: string; detail: any }> = [];
		const prevWindow = globalThis.window;

		try {
			(globalThis as any).window = {
				dispatchEvent: (ev: { type: string; detail: any }) => {
					dispatched.push({ type: ev.type, detail: ev.detail });
					return true;
				},
			};

			const res = applyOrthopedicProtocolToVisit({
				protocol: cementProto,
				options: {
					toothFdi: 46,
					material: "ZrO2 Multi-Layer",
					colorVita: "A2",
					labOrderId: "lab-order-402",
					labOrderNumber: "ЗТЛ-402",
					technicianName: "Смирнов А.В.",
					warrantyPassport: "ГП-ЗТЛ-402",
				},
				showNotification: false,
				copyToClipboard: false,
			});

			assert.ok(res.formatted.treatment.includes("Наряд ЗТЛ: ЗТЛ-402"));
			assert.ok(res.formatted.treatment.includes("Техник: Смирнов А.В."));

			const invEvent = dispatched.find((d) => d.type === "dente-add-services-to-invoice");
			assert.ok(invEvent);
			const crownService = invEvent.detail.services.find(
				(s: any) => s.code === "A16.07.004",
			);
			assert.ok(crownService);
			assert.equal(crownService.toothNumber, 46);
			assert.equal(crownService.labOrderNumber, "ЗТЛ-402");
		} finally {
			(globalThis as any).window = prevWindow;
		}
	});

	it("2. Быстрое 1-клик подтверждение примерки и фиксации у кресла", () => {
		const panelHtml = renderToString(
			<OrthopedicsChairsidePanel
				activeToothFdi={46}
				initialLabOrder={{
					id: "lab-order-402",
					orderNumber: "ЗТЛ-402",
					toothFdi: "46",
					workType: "Коронка цирконий",
					material: "ZrO2 Multi-Layer",
					colorVita: "A2",
					technicianName: "Смирнов А.В.",
					warrantyPassport: "ГП-ЗТЛ-402",
					status: "delivered_to_clinic",
				}}
			/>,
		);

		assert.ok(panelHtml.includes('data-testid="ortho-chairside-linked-lab-order-banner"'));
		assert.ok(panelHtml.includes('data-testid="ortho-chairside-confirm-fitting-btn"'));

		const billingRowHtml = renderToString(
			<ChairsideBillingItemRow
				index={0}
				item={{
					id: "srv-a16",
					code804n: "A16.07.004",
					title: "Восстановление зуба коронкой",
					toothCode: "46",
					quantity: 1,
					unitPriceRub: 22000,
					labOrderNumber: "ЗТЛ-402",
					technicianName: "Смирнов А.В.",
					materialName: "ZrO2 Multi-Layer",
					warrantyPassport: "ГП-ЗТЛ-402",
					fittingConfirmed: false,
				}}
				isWarranty100={false}
				onQuantityChange={() => {}}
				onStepPrice={() => {}}
				onPriceChange={() => {}}
				onToggleWarranty={() => {}}
				onRemoveService={() => {}}
			/>,
		);

		assert.ok(billingRowHtml.includes('data-testid="chairside-lab-order-chip-srv-a16"'));
		assert.ok(billingRowHtml.includes("Подтвердить примерку"));
	});
});
