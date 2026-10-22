import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateAppointmentLabStatus,
	formatLabReadinessIndicator,
} from "@dental/shared";
import { AppointmentModalLabSection } from "../../schedule/AppointmentModalLabSection.js";

describe("labToChairScheduleCollision — Indicators & Schedule Guard", () => {
	it("1. Маркер готовности протеза в сетке расписания и карточке пациента", () => {
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

	it("2. Блокировка накладок (Collision Guard) в AppointmentModalLabSection", () => {
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
});
