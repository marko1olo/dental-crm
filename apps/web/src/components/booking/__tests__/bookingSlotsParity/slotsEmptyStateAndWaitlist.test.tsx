import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { BookingSlotPicker } from "../../BookingSlotPicker.js";

describe("Booking Slots Parity: Honest Empty State & Waitlist (Mandates 8k, 8n)", () => {
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

	it("7. BookingSlotPicker renders canonical DENTE button and chip classes", () => {
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
			html.includes("primary-button"),
			"Waitlist CTA button must have primary-button class",
		);
		assert.ok(
			html.includes("dente-filter-chip"),
			"Period filter buttons must have dente-filter-chip class",
		);
		assert.ok(
			html.includes("secondary-button"),
			"Month toggle button must have secondary-button class",
		);
	});
});
