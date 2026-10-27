import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	DEFAULT_DOCTORS_LIST,
	generateFallbackSlots,
} from "../../publicBookingEngine.js";
import { BookingDoctorCard } from "../../BookingDoctorCard.js";

describe("Booking Slots Parity: Zero Fake Slots & Mock Purge (Mandates 8a, 8e)", () => {
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

	it("6. BookingDoctorCard does not render a fake slot string when nextAvailableSlot is undefined", () => {
		const html = renderToString(
			<BookingDoctorCard
				doctor={{
					id: "doc-1",
					fullName: "Д-р Смирнова Анна Павловна",
					specialties: ["Стоматолог-терапевт"],
					experienceYears: 7,
					rating: 4.95,
					reviewsCount: 42,
					categoryIds: ["therapy"],
				}}
				isSelected={false}
				onSelect={() => {}}
			/>,
		);

		assert.ok(
			!html.includes("Ближайший слот: Сегодня 11:30"),
			"Must NEVER render hardcoded fake slot",
		);
		assert.ok(
			!html.includes("dbw-badge-slot"),
			"Must not render slot badge when nextAvailableSlot is missing",
		);
	});
});
