import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	BookingAnyDoctorCard,
	BookingDoctorCard,
	type BookingDoctorData,
} from "../../BookingDoctorCard";
import {
	BookingSlotPicker,
	type BookingSlotItem,
} from "../../BookingSlotPicker";

describe("Booking Steps: Doctor Card & Slot Picker Sub-components", () => {
	it("renders BookingDoctorCard with doctor bio, rating, specialties and touch target", () => {
		const doc: BookingDoctorData = {
			id: "doc-test-1",
			fullName: "Д-р Морозова Ольга",
			specialties: ["Терапевт-эндодонтист"],
			experienceYears: 9,
			rating: 4.96,
			reviewsCount: 112,
			bio: "Специалист по сложному эндодонтическому лечению под микроскопом",
			categoryIds: ["all"],
		};

		const html = renderToStaticMarkup(
			createElement(BookingDoctorCard, {
				doctor: doc,
				isSelected: true,
				onSelect: () => {},
			}),
		);

		assert.ok(html.includes("dbw-doctor-card selected"));
		assert.ok(html.includes(doc.fullName));
		assert.ok(html.includes(doc.bio || ""));
		assert.ok(html.includes("Стаж 9 лет"));
		assert.ok(html.includes("4.96"));
	});

	it("renders BookingAnyDoctorCard with quick selection prompt", () => {
		const html = renderToStaticMarkup(
			createElement(BookingAnyDoctorCard, {
				isSelected: false,
				onSelect: () => {},
			}),
		);

		assert.ok(html.includes("Любой свободный специалист"));
		assert.ok(html.includes("Самая быстрая запись"));
	});

	it("renders BookingSlotPicker with filter chips, calendar days and time slots", () => {
		const testSlots: BookingSlotItem[] = [
			{ time: "09:30", startsAt: "2026-08-20T09:30:00.000Z", endsAt: "2026-08-20T10:00:00.000Z", period: "morning" },
			{ time: "14:00", startsAt: "2026-08-20T14:00:00.000Z", endsAt: "2026-08-20T14:30:00.000Z", period: "afternoon" },
			{ time: "18:30", startsAt: "2026-08-20T18:30:00.000Z", endsAt: "2026-08-20T19:00:00.000Z", period: "evening" },
		];

		const html = renderToStaticMarkup(
			createElement(BookingSlotPicker, {
				selectedDate: "2026-08-20",
				onSelectDate: () => {},
				calendarMonth: new Date(2026, 7, 1),
				onPrevMonth: () => {},
				onNextMonth: () => {},
				calendarDays: [{ dayNumber: 20, dateStr: "2026-08-20", isCurrentMonth: true, isPast: false, isToday: true, isSelected: true }],
				monthLabel: "Август 2026",
				slots: testSlots,
				selectedSlot: testSlots[0] || null,
				onSelectSlot: () => {},
				slotsLoading: false,
			}),
		);

		assert.ok(html.includes("dbw-slot-picker-root"));
		assert.ok(html.includes("dbw-period-filter-chips"));
		assert.ok(html.includes("09:30"));
		assert.ok(html.includes("14:00"));
		assert.ok(html.includes("18:30"));
	});
});
