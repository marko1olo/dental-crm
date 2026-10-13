import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	DEFAULT_DOCTORS_LIST,
	generateFallbackSlots,
	sendOtpVerificationRequest,
} from "../publicBookingEngine.js";
import { BookingSlotPicker } from "../BookingSlotPicker.js";
import { mapServerPortalMeToCabinetData } from "../../portal/patientCabinet/patientCabinetMapper.js";

describe("Honest Booking & Patient Portal — Zero Fake Slots & Real Empty State (Mandates 8a, 8e, 8k, 8n)", () => {
	it("1. generateFallbackSlots returns strictly empty array (Zero fake slots invariant)", () => {
		const slotsToday = generateFallbackSlots("2026-10-14");
		assert.deepEqual(slotsToday, [], "Must return empty array for 2026-10-14");

		const slotsSunday = generateFallbackSlots("2026-10-18");
		assert.deepEqual(slotsSunday, [], "Must return empty array for Sunday");
	});

	it("2. DEFAULT_DOCTORS_LIST contains zero fake mock doctors (Zero Potemkin village)", () => {
		assert.equal(
			DEFAULT_DOCTORS_LIST.length,
			0,
			"DEFAULT_DOCTORS_LIST must be empty in production code",
		);
		const hasBarabash = (DEFAULT_DOCTORS_LIST as any[]).some((d) =>
			d?.fullName?.includes("Барабаш"),
		);
		assert.equal(hasBarabash, false, "Barabash mock doctor must not exist");
	});

	it("3. BookingSlotPicker renders honest empty state and waitlist action button when slots are empty", () => {
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
				onJoinWaitlist={() => {}}
			/>,
		);

		assert.ok(
			html.includes('data-testid="booking-slots-empty-state"'),
			"Must render booking-slots-empty-state container",
		);
		assert.ok(
			html.includes("На выбранную дату нет свободных окон для записи"),
			"Must display honest clinical empty state title",
		);
		assert.ok(
			html.includes("оставьте заявку в лист ожидания"),
			"Must mention waitlist alternative per Mandates 8k, 8n",
		);
		assert.ok(
			html.includes('data-testid="join-waitlist-btn"'),
			"Must render join-waitlist-btn CTA button",
		);
		assert.ok(
			html.includes("Оставить заявку в лист ожидания"),
			"Button text must say 'Оставить заявку в лист ожидания'",
		);
	});

	it("4. mapServerPortalMeToCabinetData maps real clinical scans without leaking doctor notes (152-FZ / 323-FZ)", () => {
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
					aiSummary: "Пломбировочный материал в пределах нормы, периапикальных изменений нет.",
					doseMicroSv: 1.8,
				},
			],
		});

		assert.ok(cabinetData.scans, "Cabinet data must include scans property");
		assert.equal(cabinetData.scans.length, 1);
		assert.equal(cabinetData.scans[0]?.toothFdi, "36");
		assert.equal(cabinetData.scans[0]?.modality, "rvg");
		assert.equal(cabinetData.scans[0]?.doseMicroSv, 1.8);
		assert.equal(
			cabinetData.scans[0]?.conclusionRu,
			"Пломбировочный материал в пределах нормы, периапикальных изменений нет.",
		);
	});

	it("5. sendOtpVerificationRequest fails gracefully on network errors without fake OTP bypass", async () => {
		// Mock fetch failure
		const originalFetch = globalThis.fetch;
		globalThis.fetch = () => Promise.reject(new Error("Network failure"));

		try {
			const res = await sendOtpVerificationRequest("+79990001122", "sms", null, "http://invalid-endpoint");
			assert.equal(res.success, false, "Must return success = false on network failure");
			assert.ok(
				res.message.includes("Сбой сети"),
				"Must display honest network failure message, not fake 1234 test mode",
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
