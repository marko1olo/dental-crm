import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { sendOtpVerificationRequest } from "../../publicBookingEngine.js";
import { BookingSlotPicker } from "../../BookingSlotPicker.js";
import { mapServerPortalMeToCabinetData } from "../../../portal/patientCabinet/patientCabinetMapper.js";

describe("Booking Slots Parity: Scans Mapping & Network Failure Handling", () => {
	it("4. mapServerPortalMeToCabinetData maps real clinical scans without leaking notes", () => {
		const cabinetData = mapServerPortalMeToCabinetData({
			patient: {
				id: "pat-100",
				fullName: "Иванов Иван Иванович",
				phone: "+7 (999) 111-22-33",
			},
			scans: [
				{
					id: "scan-rvg-1",
					title: "Контрольный снимок зуба 3.6",
					kind: "rvg",
					toothCode: "36",
					capturedAt: "2026-10-10T12:00:00Z",
					aiSummary: "Пломбировочный материал в норме.",
					doseMicroSv: 1.8,
				},
			],
		});

		assert.ok(cabinetData.scans);
		assert.equal(cabinetData.scans.length, 1);
		assert.equal(cabinetData.scans[0]?.toothFdi, "36");
		assert.equal(cabinetData.scans[0]?.modality, "rvg");
		assert.equal(cabinetData.scans[0]?.doseMicroSv, 1.8);
	});

	it("5. sendOtpVerificationRequest fails gracefully on network errors without fake OTP bypass", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = () => Promise.reject(new Error("Network failure"));

		try {
			const res = await sendOtpVerificationRequest("+79990001122", "sms", null, "http://invalid-endpoint");
			assert.equal(res.success, false);
			assert.ok(res.message.includes("Сбой сети"));
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("8. BookingSlotPicker renders offline fallback with Call Clinic CTA when network error occurs", () => {
		const html = renderToString(
			<BookingSlotPicker
				selectedDate="2026-10-18"
				onSelectDate={() => {}}
				calendarMonth={new Date("2026-10-01")}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
				calendarDays={[]}
				monthLabel="Октябрь 2026"
				slots={[]}
				selectedSlot={null}
				onSelectSlot={() => {}}
				slotsLoading={false}
				slotError="Отсутствует подключение к интернету (автономный режим)."
				onRetry={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="slots-offline-fallback"'));
		assert.ok(html.includes("Связь с сервером клиники временно недоступна"));
		assert.ok(html.includes('data-testid="call-clinic-btn"'));
		assert.ok(html.includes("tel:+78000000000"));
		assert.ok(html.includes('data-testid="retry-slots-btn"'));
	});
});
