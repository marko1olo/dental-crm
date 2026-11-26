import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";
import { ScheduleTimeReservationModal } from "../ScheduleTimeReservationModal";
import { ScheduleMiniMonthCalendar } from "../inspector/ScheduleMiniMonthCalendar";
import { ChairMaintenanceCard } from "../grid/scheduleAppointmentTrackModules/AppointmentTrackCardOverlay";
import { ScheduleCockpitLeftPanel } from "../grid/ScheduleCockpitLeftPanel";
import {
	extractReservationIdFromBlockId,
	mapReservationsToMaintenanceBlocks,
} from "../grid/useScheduleTimeReservations";

describe("Schedule Expo26 Cockpit & Time Reservations UI", () => {
	it("renders lightweight 2-field ScheduleTimeReservationModal without uppercase or 1-click jargon", () => {
		const html = renderToStaticMarkup(
			React.createElement(ScheduleTimeReservationModal, {
				isOpen: true,
				onClose: () => undefined,
				defaultDateKey: "2026-12-01",
				chairs: [
					{ id: "chair-1", name: "Кресло 1" },
					{ id: "chair-2", name: "Кресло 2" },
				],
			}),
		);

		assert.ok(html.includes('data-testid="schedule-time-reservation-modal"'));
		assert.ok(html.includes('data-testid="time-reservation-note-input"'));
		assert.ok(html.includes('data-testid="time-reservation-start-input"'));
		assert.ok(html.includes('data-testid="time-reservation-end-input"'));
		assert.ok(html.includes("Забронировать время"));
		assert.ok(html.includes("Отмена"));
		assert.ok(!html.includes("1 клик"));
		assert.ok(!html.includes("uppercase"));
	});

	it("renders ScheduleMiniMonthCalendar with clinicLoad day indicators and legend", () => {
		const appts = [
			{ id: "a1", startsAt: "2026-12-02T09:00:00Z", status: "planned" },
			{ id: "a2", startsAt: "2026-12-02T10:00:00Z", status: "planned" },
			{ id: "a3", startsAt: "2026-12-02T11:00:00Z", status: "planned" },
			{ id: "a4", startsAt: "2026-12-02T12:00:00Z", status: "planned" },
			{ id: "a5", startsAt: "2026-12-03T09:00:00Z", status: "cancelled" },
		] as unknown as Appointment[];

		const html = renderToStaticMarkup(
			React.createElement(ScheduleMiniMonthCalendar, {
				selectedDate: "2026-12-02",
				appointments: appts,
				onSelectDate: () => undefined,
				showClinicLoad: true,
			}),
		);

		assert.ok(html.includes('data-testid="schedule-mini-calendar-load-legend"'));
		assert.ok(html.includes('data-clinic-load="medium"'));
		// Cancelled appointment on 2026-12-03 should stay load=none
		assert.ok(html.includes('aria-label="Дата 2026-12-03"'));
		assert.ok(html.includes("Загрузка дня:"));
	});

	it("maps scheduleTimeReservations onto matching chairs and renders hatched ChairMaintenanceCard", () => {
		const blocks = mapReservationsToMaintenanceBlocks(
			[
				{
					id: "r1",
					organizationId: "org-1",
					chairName: "Все кресла",
					reservationType: "lunch",
					startTime: "2026-12-01T13:00:00",
					endTime: "2026-12-01T14:00:00",
					bookingLocked: true,
					hatchingStyle: "diagonal_amber",
					note: "Обед команды",
					createdAt: "2026-12-01T08:00:00Z",
				},
			],
			[
				{ id: "chair-1", name: "Кресло 1" },
				{ id: "chair-2", name: "Кресло 2" },
			],
		);

		assert.strictEqual(blocks.length, 2);
		assert.strictEqual(extractReservationIdFromBlockId(blocks[0].id), "r1");
		assert.strictEqual(blocks[0].isReservation, true);

		const html = renderToStaticMarkup(
			React.createElement(ChairMaintenanceCard, {
				mBlock: blocks[0],
				chairId: "chair-1",
				onRemove: () => undefined,
			}),
		);

		assert.ok(html.includes("schedule-reservation-hatched"));
		assert.ok(html.includes("schedule-reservation-hatched--amber"));
		assert.ok(html.includes("Обед команды (60 мин)"));
		assert.ok(html.includes('data-testid="btn-remove-reservation-chair-1"'));
	});

	it("renders collapsible Expo26 ScheduleCockpitLeftPanel in both expanded and collapsed states", () => {
		const expandedHtml = renderToStaticMarkup(
			React.createElement(ScheduleCockpitLeftPanel, {
				isOpen: true,
				onToggleOpen: () => undefined,
				dateKey: "2026-12-01",
				onDateChange: () => undefined,
				appointments: [] as Dashboard["appointments"],
				onBookUrgentRequest: () => undefined,
			}),
		);

		assert.ok(expandedHtml.includes('data-testid="schedule-cockpit-left-panel"'));
		assert.ok(expandedHtml.includes('data-testid="schedule-mini-month-calendar"'));
		assert.ok(!expandedHtml.includes("uppercase"));
		assert.ok(!expandedHtml.includes("1 клик"));

		const collapsedHtml = renderToStaticMarkup(
			React.createElement(ScheduleCockpitLeftPanel, {
				isOpen: false,
				onToggleOpen: () => undefined,
				dateKey: "2026-12-01",
				onDateChange: () => undefined,
				appointments: [],
				onBookUrgentRequest: () => undefined,
			}),
		);

		assert.ok(collapsedHtml.includes('data-testid="schedule-cockpit-collapsed-rail"'));
		assert.ok(collapsedHtml.includes('data-testid="schedule-cockpit-toggle-btn"'));
	});
});
