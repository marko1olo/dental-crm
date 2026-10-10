import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ANNUAL_CALENDAR_SUMMARY_2026,
	PRODUCTION_CALENDAR_2026,
	TIMESHEET_STATUTORY_CODES,
	aggregateTimesheetDays,
	calculateDoctorHoursNorm,
	calculateEmployeeTimesheetT13,
	calculateNightHours,
	calculateShiftOvertime,
	calculateWorkHoursNorm,
	employeeTimesheetInputSchema,
	formT13DocumentPayloadSchema,
	generateFormT13Timesheet,
	generateTimesheetT13Csv,
	getDailyShiftNormHours,
	getDaysInMonth,
	getMonthlyProductionCalendar2026,
	isPreHolidayDay2026,
	isRussianHoliday2026,
	renderFormT13Html,
	timesheetCodeSchema,
	timesheetDayRecordSchema,
	type EmployeeTimesheetInput,
	type T13EmployeeRecord,
	type TimesheetDayRecord,
} from "../formT13TimesheetEngine.js";

describe("Decomposed Form T-13 Timesheet Engine & 2026 Production Calendar Suite", () => {
	it("1. Validates statutory Goskomstat attendance and absence codes", () => {
		assert.equal(TIMESHEET_STATUTORY_CODES.Я.digitalCode, "01");
		assert.equal(TIMESHEET_STATUTORY_CODES.Я.isWorkTime, true);
		assert.equal(TIMESHEET_STATUTORY_CODES.Н.digitalCode, "02");
		assert.equal(TIMESHEET_STATUTORY_CODES.РВ.digitalCode, "03");
		assert.equal(TIMESHEET_STATUTORY_CODES.С.digitalCode, "04");
		assert.equal(TIMESHEET_STATUTORY_CODES.В.digitalCode, "26");
		assert.equal(TIMESHEET_STATUTORY_CODES.В.isWorkTime, false);
		assert.equal(TIMESHEET_STATUTORY_CODES.ОТ.digitalCode, "09");
		assert.equal(TIMESHEET_STATUTORY_CODES.ОТ.isPaidAbsence, true);
		assert.equal(TIMESHEET_STATUTORY_CODES.Б.digitalCode, "19");
		assert.equal(TIMESHEET_STATUTORY_CODES.ДО.digitalCode, "16");
		assert.equal(timesheetCodeSchema.parse("Я"), "Я");
	});

	it("2. Verifies 2026 Russian Production Calendar norms for 33h, 36h, 39h, and 40h work weeks", () => {
		assert.equal(PRODUCTION_CALENDAR_2026.length, 12);
		assert.equal(ANNUAL_CALENDAR_SUMMARY_2026.totalCalendarDays, 365);
		assert.equal(ANNUAL_CALENDAR_SUMMARY_2026.totalWorkingDays, 247);
		assert.equal(ANNUAL_CALENDAR_SUMMARY_2026.totalWeekendAndHolidayDays, 118);
		assert.equal(ANNUAL_CALENDAR_SUMMARY_2026.totalPreHolidayDays, 5);
		assert.equal(ANNUAL_CALENDAR_SUMMARY_2026.annualHours40, 1971.0);
		assert.equal(ANNUAL_CALENDAR_SUMMARY_2026.annualHours39, 1921.6);
		assert.equal(ANNUAL_CALENDAR_SUMMARY_2026.annualHours36, 1773.4);
		assert.equal(ANNUAL_CALENDAR_SUMMARY_2026.annualHours33, 1625.2);

		// January 2026: 17 working days, 0 pre-holiday -> 17 * 6.6 = 112.2h for 33h week
		assert.equal(calculateDoctorHoursNorm(2026, 1, 33), 112.2);
		assert.equal(calculateDoctorHoursNorm(2026, 1, 40), 136.0);

		// April 2026: 22 working days, 1 pre-holiday (30 Apr) -> 22 * 6.6 - 1 = 144.2h
		assert.equal(calculateDoctorHoursNorm(2026, 4, 33), 144.2);
		assert.equal(calculateDoctorHoursNorm(2026, 4, 40), 175.0);

		// August 2026: 21 working days, 0 pre-holiday -> 21 * 6.6 = 138.6h
		const aug = getMonthlyProductionCalendar2026(8);
		assert.equal(aug.workingDays, 21);
		assert.equal(aug.hours33, 138.6);
		assert.equal(aug.hours39, 163.8);
		assert.equal(aug.hours40, 168.0);

		// Statutory holiday & pre-holiday checks
		assert.equal(isRussianHoliday2026(1, 1), true);
		assert.equal(isRussianHoliday2026(5, 9), true);
		assert.equal(isRussianHoliday2026(8, 15), false);
		assert.equal(isPreHolidayDay2026(4, 30), true);
		assert.equal(isPreHolidayDay2026(5, 8), true);
		assert.equal(isPreHolidayDay2026(8, 10), false);

		// Daily shift norm (6.6h regular, 5.6h pre-holiday for 33h dentist week)
		assert.equal(getDailyShiftNormHours(33, false), 6.6);
		assert.equal(getDailyShiftNormHours(33, true), 5.6);
		assert.equal(calculateWorkHoursNorm(21, 0, 33), 138.6);
	});

	it("3. Accurately calculates shift overtime and statutory night hours (22:00-06:00)", () => {
		const ot = calculateShiftOvertime(8.6, 6.6);
		assert.equal(ot.regularHours, 6.6);
		assert.equal(ot.overtimeHours, 2.0);

		// Daytime shift 09:00 to 15:36 -> 0 night hours
		assert.equal(calculateNightHours(9, 15.6), 0);
		// Evening shift 16:00 to 24:00 -> 2 night hours (22:00-24:00)
		assert.equal(calculateNightHours(16, 24), 2.0);
		// Overnight emergency dental shift 20:00 to 08:00 -> 8 night hours (22:00-06:00)
		assert.equal(calculateNightHours(20, 8), 8.0);
	});

	it("4. Generates Form T-13 employee records with half-month and full-month summaries", () => {
		const days: TimesheetDayRecord[] = [
			{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.6 },
			{ dayNumber: 2, primaryCode: "Я", primaryHours: 6.6, secondaryCode: "С", secondaryHours: 1.5 },
			{ dayNumber: 3, primaryCode: "Я", primaryHours: 6.6, secondaryCode: "Н", secondaryHours: 2.0 },
			{ dayNumber: 16, primaryCode: "РВ", primaryHours: 6.6 },
			{ dayNumber: 17, primaryCode: "ОТ", primaryHours: 0 },
			{ dayNumber: 18, primaryCode: "Б", primaryHours: 0 },
		];

		const input: EmployeeTimesheetInput = {
			employeeId: "doc-01",
			employeeTabNumber: "00101",
			employeeFullName: "Орлова Елена Викторовна",
			positionRu: "Врач-стоматолог-терапевт",
			departmentRu: "Терапевтическое отделение",
			year: 2026,
			month: 8,
			days,
		};

		assert.doesNotThrow(() => employeeTimesheetInputSchema.parse(input));
		assert.doesNotThrow(() => timesheetDayRecordSchema.parse(days[0]));

		const batch: readonly T13EmployeeRecord[] = generateFormT13Timesheet([input]);
		assert.equal(batch.length, 1);

		const rec = batch[0]!;
		assert.equal(rec.daysInMonth, getDaysInMonth(2026, 8));
		assert.equal(rec.firstHalfSummary.daysWorked, 3);
		assert.equal(rec.firstHalfSummary.regularHoursWorked, 19.8);
		assert.equal(rec.firstHalfSummary.overtimeHoursWorked, 1.5);
		assert.equal(rec.firstHalfSummary.nightHoursWorked, 2.0);
		assert.equal(rec.firstHalfSummary.totalHoursWorked, 23.3);

		assert.equal(rec.secondHalfSummary.daysWorked, 1);
		assert.equal(rec.secondHalfSummary.weekendHoursWorked, 6.6);
		assert.equal(rec.secondHalfSummary.vacationDays, 1);
		assert.equal(rec.secondHalfSummary.sickLeaveDays, 1);

		assert.equal(rec.monthTotalSummary.daysWorked, 4);
		assert.equal(rec.monthTotalSummary.totalHoursWorked, 29.9);
	});

	it("5. Renders Form T-13 A4 Landscape HTML and UTF-8 BOM CSV exports", () => {
		const empResult = calculateEmployeeTimesheetT13({
			employeeId: "doc-02",
			employeeTabNumber: "00102",
			employeeFullName: "Морозов Илья Андреевич",
			positionRu: "Врач-стоматолог-хирург",
			departmentRu: "Хирургическое отделение",
			year: 2026,
			month: 8,
			days: [{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.6 }],
		});

		const payload = {
			organizationLegalName: "ООО «Денте Стоматология»",
			organizationOkpo: "98765432",
			departmentName: "Хирургическое отделение",
			documentNumber: "Т13-08/2026",
			compilationDate: "2026-08-31",
			reportingPeriodStart: "2026-08-01",
			reportingPeriodEnd: "2026-08-31",
			year: 2026,
			month: 8,
			employees: [empResult],
		};

		assert.doesNotThrow(() => formT13DocumentPayloadSchema.parse(payload));

		const html = renderFormT13Html(payload);
		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("0301008"));
		assert.ok(html.includes("Морозов Илья Андреевич"));

		const csv = generateTimesheetT13Csv([empResult], "ООО «Денте Стоматология»", 2026, 8);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Морозов Илья Андреевич"));
		assert.ok(csv.includes("6.6"));
	});
});
