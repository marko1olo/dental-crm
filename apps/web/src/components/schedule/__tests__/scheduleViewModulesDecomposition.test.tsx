import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ScheduleView,
	activeVisitLockedAppointmentStatuses,
	buildChairDoctorAssignmentsByDate,
	buildChairDoctorAssignmentsFromShifts,
	default as DefaultScheduleView,
} from "../../../ScheduleView.js";
import { useScheduleFilterSummary } from "../../../components/schedule/scheduleViewModules/useScheduleFilterSummary.js";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext.js";

function FilterSummaryHarness(
	props: Parameters<typeof useScheduleFilterSummary>[0],
) {
	const result = useScheduleFilterSummary(props);
	return React.createElement(
		"div",
		{ "data-count": String(result.activeScheduleFilterCount) },
		result.scheduleFilterSummaryNode,
	);
}

describe("ScheduleView Monolith Decomposition Suite (Live 6G SUT)", () => {
	it("1. renders disconnected empty state when dashboard is missing", () => {
		const ctx = {
			dashboard: null,
			auth: {
				currentUser: { name: "Администратор" },
				denteClinicalMutationHeaders: () => ({}),
				denteClinicalReadHeaders: () => ({}),
			},
		} as unknown as AppLogicContextType;

		const html = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: ctx },
				React.createElement(ScheduleView),
			),
		);
		assert.ok(html.includes('data-testid="schedule-view-disconnected-state"'));
		assert.equal(html.includes('data-testid="schedule-view"'), false);
		assert.equal(ScheduleView, DefaultScheduleView);
	});

	it("2. renders canonical ScheduleView with id='schedule' and data-testid='schedule-view'", () => {
		const ctx = {
			dashboard: {
				appointments: [],
				patients: [],
				staff: [],
				clinicSettings: { profile: { clinicName: "ДЕНТЕ" }, chairs: [], staff: [] },
			},
			auth: {
				currentUser: { name: "Администратор" },
				denteClinicalMutationHeaders: () => ({}),
				denteClinicalReadHeaders: () => ({}),
			},
		} as unknown as AppLogicContextType;

		const html = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: ctx },
				React.createElement(ScheduleView),
			),
		);
		assert.ok(html.includes('id="schedule"'));
		assert.ok(html.includes('data-testid="schedule-view"'));
	});

	it("3. maps and sorts dual-shift chair doctor assignments and excludes cancelled shifts", () => {
		const shifts = [
			{
				id: "s-pm",
				doctorId: "doc-2",
				doctorName: "Петров П.П.",
				chairId: "chair-1",
				dateIso: "2026-10-10",
				archetypeId: "evening_shift",
				startTime: "14:00",
				endTime: "20:00",
				status: "scheduled",
			},
			{
				id: "s-am",
				doctorId: "doc-1",
				doctorName: "Иванова А.А.",
				chairId: "chair-1",
				dateIso: "2026-10-10",
				archetypeId: "morning_shift",
				startTime: "08:00",
				endTime: "14:00",
				status: "scheduled",
			},
			{
				id: "s-cancel",
				doctorId: "doc-3",
				doctorName: "Сидоров С.С.",
				chairId: "chair-2",
				dateIso: "2026-10-10",
				archetypeId: "full_day",
				startTime: "09:00",
				endTime: "21:00",
				status: "cancelled",
			},
		];

		const byChair = buildChairDoctorAssignmentsFromShifts(shifts, "2026-10-10");
		assert.ok(byChair["chair-1"]);
		assert.equal(byChair["chair-2"], undefined, "Cancelled shifts must be excluded");
		assert.equal(byChair["chair-1"].startHour, 8);
		assert.equal(byChair["chair-1"].endHour, 20);
		assert.equal(byChair["chair-1"].subShifts?.length, 2);
		assert.equal(byChair["chair-1"].subShifts?.[0]?.doctorId, "doc-1");
		assert.equal(byChair["chair-1"].subShifts?.[1]?.doctorId, "doc-2");

		const byDate = buildChairDoctorAssignmentsByDate(shifts);
		assert.ok(byDate["2026-10-10"]?.["chair-1"]);
	});

	it("4. enforces activeVisitLockedAppointmentStatuses locking terminal statuses", () => {
		assert.ok(activeVisitLockedAppointmentStatuses instanceof Set);
		assert.equal(activeVisitLockedAppointmentStatuses.has("completed"), true);
		assert.equal(activeVisitLockedAppointmentStatuses.has("cancelled"), true);
		assert.equal(activeVisitLockedAppointmentStatuses.has("no_show"), true);
		assert.equal(activeVisitLockedAppointmentStatuses.has("in_treatment"), false);
		assert.equal(activeVisitLockedAppointmentStatuses.has("planned"), false);
	});

	it("5. useScheduleFilterSummary hides empty summary and renders schedule-shift-summary when filters/warnings active", () => {
		const idleHtml = renderToStaticMarkup(
			React.createElement(FilterSummaryHarness, {
				scheduleDateFilter: "2026-10-10",
				clinicToday: "2026-10-10",
				scheduleStatusFilter: "all",
				scheduleDoctorFilterId: null,
				scheduleAssistantFilterId: null,
				scheduleChairFilterId: null,
				scheduleOverlapCount: 0,
				shiftWarnings: [],
				resetScheduleFilters: () => {},
				setScheduleDateFilter: () => {},
			}),
		);
		assert.ok(idleHtml.includes('data-count="0"'));
		assert.equal(idleHtml.includes('data-testid="schedule-shift-summary"'), false);

		const activeHtml = renderToStaticMarkup(
			React.createElement(FilterSummaryHarness, {
				scheduleDateFilter: "2026-10-11",
				clinicToday: "2026-10-10",
				scheduleStatusFilter: "arrived",
				scheduleDoctorFilterId: "doc-1",
				scheduleAssistantFilterId: null,
				scheduleChairFilterId: "chair-1",
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "В клинике",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
				dashboard: {
					clinicSettings: {
						staff: [{ id: "doc-1", fullName: "Смирнова Е.А." }],
						chairs: [{ id: "chair-1", name: "Кресло 1" }],
					},
				} as never,
				scheduleOverlapCount: 1,
				shiftWarnings: [],
				resetScheduleFilters: () => {},
				setScheduleDateFilter: () => {},
			}),
		);
		assert.ok(activeHtml.includes('data-count="4"'));
		assert.ok(activeHtml.includes('data-testid="schedule-shift-summary"'));
		assert.ok(activeHtml.includes('aria-label="Короткая сводка смены"'));
		assert.ok(activeHtml.includes("Смирнова Е.А."));
		assert.ok(activeHtml.includes("Кресло 1"));
	});
});
