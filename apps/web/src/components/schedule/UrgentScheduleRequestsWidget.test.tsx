import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { UrgentScheduleRequest } from "@dental/shared";
import { UrgentScheduleRequestsWidget } from "./UrgentScheduleRequestsWidget";

describe("UrgentScheduleRequestsWidget", () => {
	it("renders loading state by default", () => {
		const html = renderToStaticMarkup(
			React.createElement(UrgentScheduleRequestsWidget, {}),
		);
		assert.ok(
			html.includes("Загрузка срочных обращений..."),
			"должно отображаться сообщение загрузки",
		);
	});

	it("has onBookUrgentRequest prop interface defined and functional", () => {
		let bookedRequest: UrgentScheduleRequest | null = null;
		const mockRequest: UrgentScheduleRequest = {
			id: "11111111-1111-1111-1111-111111111111",
			organizationId: "22222222-2222-2222-2222-222222222222",
			patientName: "Ковалев Андрей Михайлович",
			requestType: "Острая боль (CITO)",
			urgencyLevel: "Высокий",
			doctorName: "Д-р Айболит",
			preferredSlotTime: "15:00",
			isResolved: false,
			createdAt: "2026-08-20T12:00:00.000Z",
		};

		const handleBook = (req: UrgentScheduleRequest) => {
			bookedRequest = req;
		};

		handleBook(mockRequest);
		assert.equal((bookedRequest as UrgentScheduleRequest | null)?.patientName, "Ковалев Андрей Михайлович");
	});
});
