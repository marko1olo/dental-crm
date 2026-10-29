import assert from "node:assert/strict";
import React from "react";
import { describe, it } from "vitest";
import { renderToString } from "react-dom/server";
import { LabOrdersPanel } from "../LabOrdersPanel";
import { LabOrderCardItem } from "../LabOrderCardItem";
import type { LabOrder } from "../labOrdersTypes";

describe("LabOrdersPanel & LabOrderCardItem — Red Team Clinical Audit (SSOT)", () => {
	it("1. LabOrdersPanel renders header, single Primary CTA button, and empty state when no orders", () => {
		const html = renderToString(<LabOrdersPanel patientId="pat-test-uuid-001" />);

		assert.ok(html.includes("Наряды в лабораторию (ЗТЛ)"), "Must render canonical title");
		assert.ok(html.includes("data-testid=\"lab-order-panel-create-btn\""), "Must render create order button");
		assert.ok(html.includes("+ Новый наряд в ЗТЛ"), "Must render Primary CTA text");
		assert.ok(html.includes("Нет оформленных заказов в лабораторию"), "Must render empty state message");
	});

	it("2. LabOrderCardItem renders complete clinical information without text clipping", () => {
		const sampleOrder: LabOrder = {
			id: "ord-test-123456",
			patientId: "pat-test-uuid-001",
			patientName: "Ковалев Дмитрий Сергеевич",
			doctorId: "doc-1",
			doctorName: "Д-р Смирнова Е. В.",
			secureToken: "token-abc-123",
			toothFdi: "16",
			material: "Диоксид циркония Multi-Layer",
			colorVita: "A2",
			status: "sent",
			dueDate: "2026-11-15T12:00:00.000Z",
			clinicalNotes: "Уступ 1.0 мм, центральная окклюзия",
			labComments: null,
			attachedImageUrl: null,
			priceRub: 24000,
			labCostRub: 7500,
			createdAt: "2026-10-25T10:00:00.000Z",
		};

		const html = renderToString(
			<LabOrderCardItem
				order={sampleOrder}
				onOpenPrintOrder={() => {}}
				onOpenEditOrder={() => {}}
				onOpenTracking={() => {}}
				onCopyPortalLink={() => {}}
				onStatusTransition={() => {}}
			/>,
		);

		const cleanHtml = html.replace(/\u00A0/g, " ");
		assert.ok(cleanHtml.includes("Зуб 16"), "Must render tooth FDI 16");
		assert.ok(cleanHtml.includes("Диоксид циркония Multi-Layer"), "Must render material");
		assert.ok(cleanHtml.includes("VITA: A2"), "Must render VITA shade");
		assert.ok(cleanHtml.includes("Отправлен в ЗТЛ"), "Must render clinical status in Russian");
		assert.ok(cleanHtml.includes("Взять в работу"), "Must render 1-click status transition action");
		assert.ok(cleanHtml.includes("24 000") || cleanHtml.includes("24000"), "Must render order price");
		assert.ok(cleanHtml.includes("Бланк ЗТЛ-1"), "Must render print blank action");
		assert.ok(cleanHtml.includes("Ссылка технику"), "Must render technician link action");
	});

	it("3. LabOrderCardItem renders warranty badge when order is marked as warranty", () => {
		const warrantyOrder: LabOrder = {
			id: "ord-warranty-999",
			patientId: "pat-test-uuid-001",
			secureToken: "token-warranty",
			toothFdi: "21",
			material: "Коронка E.max",
			status: "refitting",
			isWarranty: true,
			priceRub: 0,
			createdAt: "2026-10-28T09:00:00.000Z",
		};

		const html = renderToString(<LabOrderCardItem order={warrantyOrder} />);

		assert.ok(html.includes("Гарантия"), "Must display warranty indicator");
		assert.ok(html.includes("Примерка каркаса / керамики"), "Must display fitting status");
	});
});
