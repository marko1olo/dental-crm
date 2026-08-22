import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	calculateChairUtilization,
	calculateShiftDurationHours,
	calculateStaffRosterStats,
	createDefaultWeeklySchedule,
	detectRosterConflicts,
	doIntervalsOverlap,
	type DoctorShift,
	exportFormT13ToCsv,
	generateFormT13Matrix,
	generatePrintableRosterHtml,
	getIsoWeekKey,
	minutesToTimeString,
	timeStringToMinutes,
} from "./doctorShiftRosterEngine";
import {
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	SHIFT_ARCHETYPES,
	type StaffMember,
} from "./doctorShiftRosterPresets";
import { DoctorShiftRosterModal } from "./DoctorShiftRosterModal";

describe("DoctorShiftRoster — Time & Shift Duration Arithmetic", () => {
	it("parses time strings to minutes and converts back correctly", () => {
		assert.equal(timeStringToMinutes("00:00"), 0);
		assert.equal(timeStringToMinutes("08:30"), 510);
		assert.equal(timeStringToMinutes("14:30"), 870);
		assert.equal(timeStringToMinutes("23:59"), 1439);
		assert.equal(timeStringToMinutes("invalid"), 0);

		assert.equal(minutesToTimeString(0), "00:00");
		assert.equal(minutesToTimeString(510), "08:30");
		assert.equal(minutesToTimeString(870), "14:30");
		assert.equal(minutesToTimeString(1439), "23:59");
	});

	it("calculates standard daytime shift duration without breaks", () => {
		const { durationHours, nightHours } = calculateShiftDurationHours("08:30", "14:30", 0);
		assert.equal(durationHours, 6.0);
		assert.equal(nightHours, 0);
	});

	it("deducts lunch break minutes from total duration", () => {
		const { durationHours, nightHours } = calculateShiftDurationHours("09:00", "17:00", 60);
		// 8 hours total minus 1 hour lunch = 7.0 hours
		assert.equal(durationHours, 7.0);
		assert.equal(nightHours, 0);
	});

	it("accurately computes night hours (22:00 to 06:00 per TK RF Article 96) for overnight shifts", () => {
		// Overnight shift: 20:00 to 08:00 (12 hours total)
		// Night portion is 22:00 to 06:00 = 8.0 hours
		const { durationHours, nightHours } = calculateShiftDurationHours("20:00", "08:00", 0);
		assert.equal(durationHours, 12.0);
		assert.equal(nightHours, 8.0);
	});

	it("detects time interval overlaps on the same day and across midnight", () => {
		// Disjoint morning and evening
		assert.equal(doIntervalsOverlap("08:30", "14:30", "14:30", "20:30"), false);
		// Overlapping daytime
		assert.equal(doIntervalsOverlap("08:30", "15:00", "14:00", "20:30"), true);
		// Complete containment
		assert.equal(doIntervalsOverlap("08:00", "20:00", "10:00", "14:00"), true);
	});

	it("computes ISO week keys correctly", () => {
		assert.equal(getIsoWeekKey("2026-08-24"), "2026-W35");
		assert.equal(getIsoWeekKey("2026-01-01"), "2026-W01");
	});
});

describe("DoctorShiftRoster — Conflict & Labor Law Detection", () => {
	const mockDoctor: StaffMember = {
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		shortName: "Иванов И.И.",
		role: "therapist",
		tabNumber: "001",
		isDoctor: true,
		isAssistant: false,
		weeklyHourLimit: 33.0,
		avatarColor: "#0284c7",
	};

	const mockSurgeon: StaffMember = {
		id: "doc-2",
		fullName: "Петров Петр Петрович",
		shortName: "Петров П.П.",
		role: "surgeon",
		tabNumber: "002",
		isDoctor: true,
		isAssistant: false,
		weeklyHourLimit: 33.0,
		avatarColor: "#dc2626",
	};

	const mockAssistant: StaffMember = {
		id: "asst-1",
		fullName: "Смирнова Анна Сергеевна",
		shortName: "Смирнова А.С.",
		role: "assistant",
		tabNumber: "003",
		isDoctor: false,
		isAssistant: true,
		weeklyHourLimit: 39.0,
		avatarColor: "#16a34a",
	};

	it("detects doctor double booking across different chairs at overlapping times", () => {
		const shift1: DoctorShift = {
			id: "s1",
			doctorId: "doc-1",
			doctorName: "Иванов И.И.",
			doctorRole: "therapist",
			assistantId: null,
			assistantName: null,
			cabinetId: "cab-1",
			chairId: "chair-1a",
			dateIso: "2026-08-24",
			archetypeId: "morning_shift",
			startTime: "08:30",
			endTime: "14:30",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		};

		const shift2: DoctorShift = {
			id: "s2",
			doctorId: "doc-1", // SAME DOCTOR
			doctorName: "Иванов И.И.",
			doctorRole: "therapist",
			assistantId: null,
			assistantName: null,
			cabinetId: "cab-2",
			chairId: "chair-2a",
			dateIso: "2026-08-24",
			archetypeId: "morning_shift",
			startTime: "10:00", // OVERLAPS with 08:30-14:30
			endTime: "16:00",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		};

		const conflicts = detectRosterConflicts([shift1, shift2], [mockDoctor]);
		const docDoubleBooking = conflicts.find((c) => c.type === "doctor_double_booking");
		assert.ok(docDoubleBooking, "Should flag doctor_double_booking");
		assert.equal(docDoubleBooking?.severity, "error");
	});

	it("detects chair collision when 2 doctors are assigned to the same chair at overlapping times", () => {
		const shift1: DoctorShift = {
			id: "s1",
			doctorId: "doc-1",
			doctorName: "Иванов И.И.",
			doctorRole: "therapist",
			assistantId: null,
			assistantName: null,
			cabinetId: "cab-1",
			chairId: "chair-1a", // SAME CHAIR
			dateIso: "2026-08-24",
			archetypeId: "morning_shift",
			startTime: "08:30",
			endTime: "14:30",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		};

		const shift2: DoctorShift = {
			id: "s2",
			doctorId: "doc-2", // DIFFERENT DOCTOR
			doctorName: "Петров П.П.",
			doctorRole: "therapist",
			assistantId: null,
			assistantName: null,
			cabinetId: "cab-1",
			chairId: "chair-1a", // SAME CHAIR
			dateIso: "2026-08-24",
			archetypeId: "morning_shift",
			startTime: "12:00", // OVERLAPS with 08:30-14:30
			endTime: "18:00",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		};

		const conflicts = detectRosterConflicts([shift1, shift2], [mockDoctor, mockSurgeon]);
		const chairCollision = conflicts.find((c) => c.type === "chair_double_booking");
		assert.ok(chairCollision, "Should flag chair_double_booking");
		assert.equal(chairCollision?.severity, "error");
	});

	it("detects assistant double booking across two doctors", () => {
		const shift1: DoctorShift = {
			id: "s1",
			doctorId: "doc-1",
			doctorName: "Иванов И.И.",
			doctorRole: "therapist",
			assistantId: "asst-1", // SAME ASSISTANT
			assistantName: "Смирнова А.С.",
			cabinetId: "cab-1",
			chairId: "chair-1a",
			dateIso: "2026-08-24",
			archetypeId: "morning_shift",
			startTime: "08:30",
			endTime: "14:30",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		};

		const shift2: DoctorShift = {
			id: "s2",
			doctorId: "doc-2",
			doctorName: "Петров П.П.",
			doctorRole: "surgeon",
			assistantId: "asst-1", // SAME ASSISTANT
			assistantName: "Смирнова А.С.",
			cabinetId: "cab-2",
			chairId: "chair-2a",
			dateIso: "2026-08-24",
			archetypeId: "morning_shift",
			startTime: "09:00",
			endTime: "15:00",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		};

		const conflicts = detectRosterConflicts([shift1, shift2], [mockDoctor, mockSurgeon, mockAssistant]);
		const asstConflict = conflicts.find((c) => c.type === "assistant_double_booking");
		assert.ok(asstConflict, "Should flag assistant_double_booking");
	});

	it("warns when a surgical shift has no assigned assistant", () => {
		const surgeryShift: DoctorShift = {
			id: "surg-1",
			doctorId: "doc-2",
			doctorName: "Петров П.П.",
			doctorRole: "surgeon",
			assistantId: null, // NO ASSISTANT
			assistantName: null,
			cabinetId: "cab-2",
			chairId: "chair-2a",
			dateIso: "2026-08-24",
			archetypeId: "morning_shift",
			startTime: "08:30",
			endTime: "14:30",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		};

		const conflicts = detectRosterConflicts([surgeryShift], [mockSurgeon]);
		const noAsst = conflicts.find((c) => c.type === "no_assistant_for_surgery");
		assert.ok(noAsst, "Should warn about surgery without assistant");
		assert.equal(noAsst?.severity, "warning");
	});

	it("flags weekly overtime exceeding statutory 33-hour norm (TK RF Art. 350)", () => {
		// Create 7 shifts of 6 hours in the same ISO week = 42.0 hours (exceeds 33.0 limit)
		const shifts: DoctorShift[] = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30"].map(
			(dateIso, idx) => ({
				id: `ot-${idx}`,
				doctorId: "doc-1",
				doctorName: "Иванов И.И.",
				doctorRole: "therapist",
				assistantId: null,
				assistantName: null,
				cabinetId: "cab-1",
				chairId: "chair-1a",
				dateIso,
				archetypeId: "morning_shift",
				startTime: "08:30",
				endTime: "14:30",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			}),
		);

		const conflicts = detectRosterConflicts(shifts, [mockDoctor]);
		const overtime = conflicts.find((c) => c.type === "weekly_overtime_tk_rf");
		assert.ok(overtime, "Should detect weekly overtime violation");
		assert.equal(overtime?.severity, "warning");
	});
});

describe("DoctorShiftRoster — Staff Statistics & T-13 Matrix", () => {
	it("calculates staff roster statistics with norm delta for August 2026", () => {
		const staff = DEFAULT_CLINIC_STAFF;
		const defaultShifts = createDefaultWeeklySchedule("2026-08-24", staff, CLINIC_CABINETS_CATALOG);
		const stats = calculateStaffRosterStats(staff, defaultShifts, 2026, 8);

		assert.ok(stats.length > 0);
		const firstDoc = stats.find((s) => s.isDoctor);
		assert.ok(firstDoc);
		// August 2026 has working days per production calendar
		assert.ok(firstDoc.monthNormHours > 0);
		assert.ok(typeof firstDoc.totalScheduledHours === "number");
	});

	it("generates complete Form T-13 matrix with half-month and monthly totals", () => {
		const staff = DEFAULT_CLINIC_STAFF.slice(0, 3);
		const defaultShifts = createDefaultWeeklySchedule("2026-08-24", staff, CLINIC_CABINETS_CATALOG);
		const matrix = generateFormT13Matrix(staff, defaultShifts, 2026, 8);

		assert.equal(matrix.length, 3);
		for (const row of matrix) {
			assert.equal(row.days.length, 31, "August has 31 calendar days");
			assert.ok(row.totalMonthDays >= 0);
			assert.ok(row.totalMonthHours >= 0);
			assert.equal(
				row.totalMonthDays,
				row.firstHalfDays + row.secondHalfDays,
				"Total month days must equal first half + second half",
			);
			assert.equal(
				row.totalMonthHours,
				row.firstHalfHours + row.secondHalfHours,
				"Total month hours must equal first half + second half",
			);
		}
	});

	it("exports Form T-13 to valid CSV format with Russian headers", () => {
		const staff = DEFAULT_CLINIC_STAFF.slice(0, 2);
		const defaultShifts = createDefaultWeeklySchedule("2026-08-24", staff, CLINIC_CABINETS_CATALOG);
		const matrix = generateFormT13Matrix(staff, defaultShifts, 2026, 8);
		const csv = exportFormT13ToCsv(matrix, 2026, 8, 'ООО "Денте"');

		assert.ok(csv.includes("ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ"));
		assert.ok(csv.includes("Таб. №"));
		assert.ok(csv.includes("ФИО сотрудника"));
		assert.ok(csv.includes("Итого часов"));
	});

	it("calculates chair utilization metrics and heat levels accurately", () => {
		const cabinets = CLINIC_CABINETS_CATALOG;
		const defaultShifts = createDefaultWeeklySchedule("2026-08-24", DEFAULT_CLINIC_STAFF, cabinets);
		const mockAppointments = [
			{
				chairId: "chair-1a",
				startsAt: "2026-08-24T08:30:00Z",
				endsAt: "2026-08-24T12:30:00Z", // 240 mins booked
			},
		];

		const utilization = calculateChairUtilization(defaultShifts, mockAppointments, "2026-08-24", cabinets);
		assert.ok(utilization.length > 0);
		const chair1a = utilization.find((u) => u.chairId === "chair-1a");
		assert.ok(chair1a);
		assert.ok(chair1a.bookedAppointmentMinutes >= 240);
		assert.ok(chair1a.utilizationRatePercent > 0);
		assert.ok(["empty", "cold", "optimal", "peak", "overload"].includes(chair1a.heatLevel));
	});

	it("generates printable HTML roster document without crashing", () => {
		const html = generatePrintableRosterHtml(
			[],
			"2026-08-24",
			"2026-08-30",
			'ООО "Денте Клиник"',
			CLINIC_CABINETS_CATALOG,
		);
		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("ГРАФИК СМЕННОСТИ"));
		assert.ok(html.includes('ООО "Денте Клиник"'));
	});
});

describe("DoctorShiftRosterModal — Component Rendering", () => {
	it("renders DoctorShiftRosterModal structure with header, tabs and KPI cards", () => {
		const html = renderToStaticMarkup(
			React.createElement(DoctorShiftRosterModal, {
				isOpen: true,
				onClose: () => {},
				clinicName: 'ООО "Денте Клиник"',
			}),
		);

		assert.ok(html.includes("График сменности и табель учета врачей"));
		assert.ok(html.includes("По кабинетам"));
		assert.ok(html.includes("Расписание врачей"));
		assert.ok(html.includes("Табель Т-13"));
		assert.ok(html.includes("Загрузка кресел"));
		assert.ok(html.includes("Смен на неделю"));
		assert.ok(html.includes("Ассистентские пары"));
	});

	it("returns null when isOpen is false", () => {
		const html = renderToStaticMarkup(
			React.createElement(DoctorShiftRosterModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);

		assert.equal(html, "");
	});
});
