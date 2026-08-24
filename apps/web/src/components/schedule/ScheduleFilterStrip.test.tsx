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
			html.includes("secondary-button schedule-day-step-prev"),
			"Renders previous day step button",
		);
		assert.ok(
			html.includes("secondary-button schedule-day-step-next"),
			"Renders next day step button",
		);
		assert.ok(
			html.includes('type="date"'),
			"Renders date filter input control",
		);
		assert.ok(
			html.includes("schedule-date-picker-group"),
			"Renders schedule date picker control group with date stepper and input",
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

	it("renders 'Пациент с острой болью (CITO!)' button when onEmergencyCitoBooking is provided", () => {
		const html = renderToStaticMarkup(
			createElement(ScheduleFilterStrip, {
				scheduleDateFilter: "2026-08-09",
				setScheduleDateFilter: () => {},
				stepScheduleDay: () => {},
				activeScheduleFilterCount: 0,
				resetScheduleFilters: () => {},
				staffMembers: [],
				chairs: [],
				scheduleDoctorFilterId: null,
				setScheduleDoctorFilterId: () => {},
				scheduleChairFilterId: null,
				setScheduleChairFilterId: () => {},
				onEmergencyCitoBooking: () => {},
			}),
		);

		assert.ok(
			html.includes("Острая боль (CITO!)"),
			"Contains 'Острая боль (CITO!)' text",
		);
		assert.ok(
			html.includes("aria-label=\"Пациент с острой болью CITO: быстрая запись дежурному врачу\""),
			"Contains accessible CITO aria label",
		);
	});

	it("renders chair chips with Russian dental specialization ('Кресло 1 (Терапия)', 'Кресло 2 (Хирургия)', 'Кресло 3 (Ортодонтия)')", () => {
		const html = renderToStaticMarkup(
			createElement(ScheduleFilterStrip, {
				scheduleDateFilter: "2026-08-24",
				setScheduleDateFilter: () => {},
				stepScheduleDay: () => {},
				activeScheduleFilterCount: 1,
				resetScheduleFilters: () => {},
				staffMembers: [],
				chairs: [
					{ id: "chair-1", name: "Кресло 1", specialization: "therapist", room: "Каб. 1", active: true },
					{ id: "chair-2", name: "Кресло 2", specialization: "surgeon", room: "Каб. 2", active: true },
					{ id: "chair-3", name: "Кресло 3", specialization: "orthodontist", room: "Каб. 3", active: true },
				],
				scheduleDoctorFilterId: null,
				setScheduleDoctorFilterId: () => {},
				scheduleChairFilterId: "chair-1",
				setScheduleChairFilterId: () => {},
			}),
		);

		assert.ok(html.includes("Кресло 1 (Терапия)"), "Renders 'Кресло 1 (Терапия)'");
		assert.ok(html.includes("Кресло 2 (Хирургия)"), "Renders 'Кресло 2 (Хирургия)'");
		assert.ok(html.includes("Кресло 3 (Ортодонтия)"), "Renders 'Кресло 3 (Ортодонтия)'");
		assert.ok(html.includes("quick-chip active"), "Marks active chair chip with active class");
	});

	it("falls back to default clinic chairs with specializations when chairs list is empty", () => {
		const html = renderToStaticMarkup(
			createElement(ScheduleFilterStrip, {
				scheduleDateFilter: "2026-08-24",
				setScheduleDateFilter: () => {},
				stepScheduleDay: () => {},
				activeScheduleFilterCount: 0,
				resetScheduleFilters: () => {},
				staffMembers: [],
				chairs: [],
				scheduleDoctorFilterId: null,
				setScheduleDoctorFilterId: () => {},
				scheduleChairFilterId: null,
				setScheduleChairFilterId: () => {},
			}),
		);

		assert.ok(html.includes("Кресло 1 (Терапия)"), "Falls back to default 'Кресло 1 (Терапия)'");
		assert.ok(html.includes("Кресло 2 (Хирургия)"), "Falls back to default 'Кресло 2 (Хирургия)'");
		assert.ok(html.includes("Кресло 3 (Ортодонтия)"), "Falls back to default 'Кресло 3 (Ортодонтия)'");
	});

	it("renders 'Пациент' quick search button when onOpenPatientSearch is provided", () => {
		const html = renderToStaticMarkup(
			createElement(ScheduleFilterStrip, {
				scheduleDateFilter: "2026-08-25",
				setScheduleDateFilter: () => {},
				stepScheduleDay: () => {},
				activeScheduleFilterCount: 0,
				resetScheduleFilters: () => {},
				staffMembers: [],
				chairs: [],
				scheduleDoctorFilterId: null,
				setScheduleDoctorFilterId: () => {},
				scheduleChairFilterId: null,
				setScheduleChairFilterId: () => {},
				onOpenPatientSearch: () => {},
			}),
		);

		assert.ok(html.includes("Пациент"), "Renders 'Пациент' button text");
		assert.ok(html.includes("Ctrl+K"), "Contains hotkey title for instant patient search");
	});

	it("renders '📅 Сегодня', 'Завтра', 'Вся неделя' quick day switcher buttons", () => {
		const todayIso = new Date().toISOString().slice(0, 10);
		const html = renderToStaticMarkup(
			createElement(ScheduleFilterStrip, {
				scheduleDateFilter: todayIso,
				setScheduleDateFilter: () => {},
				stepScheduleDay: () => {},
				activeScheduleFilterCount: 0,
				resetScheduleFilters: () => {},
				staffMembers: [],
				chairs: [],
				scheduleDoctorFilterId: null,
				setScheduleDoctorFilterId: () => {},
				scheduleChairFilterId: null,
				setScheduleChairFilterId: () => {},
			}),
		);

		assert.ok(html.includes("📅 Сегодня"), "Renders '📅 Сегодня' button");
		assert.ok(html.includes("Завтра"), "Renders 'Завтра' button");
		assert.ok(html.includes("Вся неделя"), "Renders 'Вся неделя' button");
	});
});

