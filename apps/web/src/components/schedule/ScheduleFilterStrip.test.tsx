import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScheduleFilterStrip } from "./ScheduleFilterStrip";

describe("ScheduleFilterStrip Component", () => {
	it("renders 'Все записи' quick chip button and date picker control group", () => {
		const html = renderToStaticMarkup(
			createElement(ScheduleFilterStrip, {
				scheduleDateFilter: "2026-08-09",
				setScheduleDateFilter: () => {},
				stepScheduleDay: () => {},
				activeScheduleFilterCount: 0,
				resetScheduleFilters: () => {},
				staffMembers: [
					{
						id: "doc-1",
						fullName: "Иван Иванов",
						active: true,
						role: "doctor",
					},
				],
				chairs: [{ id: "chair-1", name: "Кресло 1", active: true }],
				isSoloDoctor: false,
				scheduleDoctorFilterId: null,
				setScheduleDoctorFilterId: () => {},
				scheduleChairFilterId: null,
				setScheduleChairFilterId: () => {},
			}),
		);

		assert.ok(html.includes("Все записи"), "Contains 'Все записи' button text");
		assert.ok(
			html.includes("quick-chip active"),
			"Sets active class on 'Все записи' chip when activeScheduleFilterCount === 0",
		);
		assert.ok(
			html.includes('class="secondary-button schedule-day-step-prev"'),
			"Renders previous day step button",
		);
		assert.ok(
			html.includes('class="secondary-button schedule-day-step-next"'),
			"Renders next day step button",
		);
		assert.ok(
			html.includes('type="date"'),
			"Renders date filter input control",
		);
		assert.ok(
			html.includes("height:32px") || html.includes("height: 32px"),
			"Enforces explicit matching 32px height for vertical alignment",
		);
	});

	it("renders non-active 'Все записи' chip when filters are active", () => {
		const html = renderToStaticMarkup(
			createElement(ScheduleFilterStrip, {
				scheduleDateFilter: "2026-08-09",
				setScheduleDateFilter: () => {},
				stepScheduleDay: () => {},
				activeScheduleFilterCount: 1,
				resetScheduleFilters: () => {},
				staffMembers: [],
				chairs: [],
				isSoloDoctor: false,
				scheduleDoctorFilterId: "doc-1",
				setScheduleDoctorFilterId: () => {},
				scheduleChairFilterId: null,
				setScheduleChairFilterId: () => {},
			}),
		);

		assert.ok(html.includes("Все записи"), "Contains 'Все записи' button text");
		assert.ok(
			!html.includes("quick-chip active"),
			"Does not mark 'Все записи' as active when activeScheduleFilterCount > 0",
		);
	});
});
