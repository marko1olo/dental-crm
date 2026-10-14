import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateAppointmentLabStatus,
	formatLabReadinessIndicator,
} from "@dental/shared";
import { AppointmentModalLabSection } from "../../schedule/AppointmentModalLabSection.js";
import { OrthopedicsChairsidePanel } from "../../orthopedics/OrthopedicsChairsidePanel.js";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	applyOrthopedicProtocolToVisit,
} from "../../orthopedics/orthopedicProtocols.js";
import { ChairsideBillingItemRow } from "../../visit/ChairsideBillingItemRow.js";

describe("LAB-TO-CHAIR INTEGRATION INQUISITOR — Сквозная клиническая связка ЗТЛ ↔ Расписание ↔ Приём ортопеда", () => {
	it("1. Маркер готовности протеза в сетке расписания и карточке пациента при переходе в delivered_to_clinic / ready_in_clinic", () => {
		const readinessText = formatLabReadinessIndicator({
			workType: "Коронка цирконий",
			toothFdi: "46",
		});
		assert.equal(readinessText, "Работа из ЗТЛ доставлена: Коронка цирконий зуб 46");

		const statusDelivered = evaluateAppointmentLabStatus({
			id: "order-402",
			orderNumber: "ЗТЛ-402",
			status: "delivered_to_clinic",
			workType: "Коронка цирконий",
			toothFdi: "46",
			colorVita: "A2",
		});
		assert.ok(statusDelivered);
		assert.equal(statusDelivered.state, "ready_in_clinic");
		assert.equal(
			statusDelivered.readinessText,
			"Работа из ЗТЛ доставлена: Коронка цирконий зуб 46",
		);
	});

	it("2. Блокировка накладок (Collision Guard): при записи на примерку раньше плановой готовности ЗТЛ выводит заметный алерт-баннер и 1-клик синхронизацию", () => {
		const html = renderToString(
			<AppointmentModalLabSection
				appointment={{
					id: "appt-collision",
					organizationId: "org-1",
					doctorUserId: "doc-1",
					chairId: "chair-1",
					patientId: "p-46",
					status: "planned",
					startsAt: "2026-10-20T10:00:00.000Z",
					endsAt: "2026-10-20T11:00:00.000Z",
					reason: "Примерка",
					comment: null,
				}}
				activeLabOrders={[
					{
						id: "lab-collision-46",
						patientId: "p-46",
						orderNumber: "ЗТЛ-402",
						status: "in_progress",
						dueDate: "2026-10-25T10:00:00.000Z",
						toothFdi: "46",
						material: "Коронка цирконий",
						colorVita: "A2",
					},
				]}
				startsAtLocal="2026-10-20T10:00"
				setStartsAtLocal={() => {}}
				setEndsAtLocal={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="appointment-modal-lab-collision-alert"'));
		assert.ok(
			html.includes(
				"Внимание: плановая готовность работы ЗТЛ 25.10, выбранная дата раньше",
			),
		);
		assert.ok(html.includes('data-testid="appointment-modal-sync-lab-date-banner-btn"'));
	});

	it("3. Авто-привязка заказа к протоколу приёма ортопеда (номер наряда, техник, материал, гарантийный паспорт -> зуб 46 и услуга A16.07.004)", () => {
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
			assert.ok(res.formatted.treatment.includes("Гарантийный паспорт: ГП-ЗТЛ-402"));

			const invEvent = dispatched.find((d) => d.type === "dente-add-services-to-invoice");
			assert.ok(invEvent);
			const crownService = invEvent.detail.services.find(
				(s: any) => s.code === "A16.07.004",
			);
			assert.ok(crownService);
			assert.equal(crownService.toothNumber, 46);
			assert.equal(crownService.labOrderNumber, "ЗТЛ-402");
			assert.equal(crownService.technicianName, "Смирнов А.В.");
			assert.equal(crownService.materialName, "ZrO2 Multi-Layer");
			assert.equal(crownService.warrantyPassport, "ГП-ЗТЛ-402");
		} finally {
			(globalThis as any).window = prevWindow;
		}
	});

	it("4. Быстрое 1-клик подтверждение примерки и фиксации из карточки визита и сметы у кресла", () => {
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
		assert.ok(panelHtml.includes("Работа из ЗТЛ доставлена: Коронка цирконий зуб 46"));
		assert.ok(panelHtml.includes('data-testid="ortho-chairside-confirm-fitting-btn"'));

		const billingRowHtml = renderToString(
			<ChairsideBillingItemRow
				index={0}
				item={{
					id: "srv-a16",
					code804n: "A16.07.004",
					title: "Восстановление зуба коронкой (постоянная конструкция из ЗТЛ)",
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
		assert.ok(billingRowHtml.includes('data-testid="chairside-confirm-fitting-btn-srv-a16"'));
		assert.ok(billingRowHtml.includes("Подтвердить примерку"));
	});
});
