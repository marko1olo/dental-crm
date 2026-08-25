import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateEmployeeTimesheetT13,
	aggregateTimesheetDays,
	generateTimesheetT13Csv,
	getDaysInMonth,
	TIMESHEET_STATUTORY_CODES,
	type TimesheetDayRecord,
	type EmployeeTimesheetInput,
} from "../finance/timesheetT13.js";

describe("Statutory Form T-13 Timesheet Engine (Госкомстат РФ № 1)", () => {
	it("1.1 Accurately evaluates days in month for leap and non-leap years", () => {
		assert.equal(getDaysInMonth(2024, 2), 29); // Leap year 2024
		assert.equal(getDaysInMonth(2026, 2), 28); // Standard year 2026
		assert.equal(getDaysInMonth(2026, 8), 31); // August
		assert.equal(getDaysInMonth(2026, 9), 30); // September
	});

	it("1.2 Validates statutory Russian letter and digital codes", () => {
		assert.equal(TIMESHEET_STATUTORY_CODES["Я"].digitalCode, "01");
		assert.equal(TIMESHEET_STATUTORY_CODES["Я"].isWorkTime, true);
		assert.equal(TIMESHEET_STATUTORY_CODES["Н"].digitalCode, "02");
		assert.equal(TIMESHEET_STATUTORY_CODES["В"].digitalCode, "26");
		assert.equal(TIMESHEET_STATUTORY_CODES["В"].isWorkTime, false);
		assert.equal(TIMESHEET_STATUTORY_CODES["ОТ"].digitalCode, "09");
		assert.equal(TIMESHEET_STATUTORY_CODES["ОТ"].isPaidAbsence, true);
		assert.equal(TIMESHEET_STATUTORY_CODES["Б"].digitalCode, "19");
		assert.equal(TIMESHEET_STATUTORY_CODES["ДО"].digitalCode, "16");
	});

	it("1.3 Correctly aggregates doctor work schedule with regular shifts, overtime, and weekend days", () => {
		const days: TimesheetDayRecord[] = [
			// Week 1 (Days 1..7)
			{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.0 }, // Mon
			{ dayNumber: 2, primaryCode: "Я", primaryHours: 6.0, secondaryCode: "С", secondaryHours: 2.0 }, // Tue (6h + 2h overtime)
			{ dayNumber: 3, primaryCode: "Я", primaryHours: 6.0 }, // Wed
			{ dayNumber: 4, primaryCode: "Я", primaryHours: 6.0 }, // Thu
			{ dayNumber: 5, primaryCode: "Я", primaryHours: 6.0 }, // Fri
			{ dayNumber: 6, primaryCode: "В", primaryHours: 0 }, // Sat
			{ dayNumber: 7, primaryCode: "В", primaryHours: 0 }, // Sun
			// Week 2 (Days 8..14)
			{ dayNumber: 8, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 9, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 10, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 11, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 12, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 13, primaryCode: "В", primaryHours: 0 },
			{ dayNumber: 14, primaryCode: "В", primaryHours: 0 },
			// Day 15
			{ dayNumber: 15, primaryCode: "Я", primaryHours: 6.0 },
			// Days 16..20: Sick leave (Б)
			{ dayNumber: 16, primaryCode: "Б", primaryHours: 0 },
			{ dayNumber: 17, primaryCode: "Б", primaryHours: 0 },
			{ dayNumber: 18, primaryCode: "Б", primaryHours: 0 },
			{ dayNumber: 19, primaryCode: "Б", primaryHours: 0 },
			{ dayNumber: 20, primaryCode: "Б", primaryHours: 0 },
			{ dayNumber: 21, primaryCode: "В", primaryHours: 0 },
			{ dayNumber: 22, primaryCode: "В", primaryHours: 0 },
			// Days 23..31: Regular + Holiday work
			{ dayNumber: 23, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 24, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 25, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 26, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 27, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 28, primaryCode: "РВ", primaryHours: 6.0 }, // Weekend shift
			{ dayNumber: 29, primaryCode: "В", primaryHours: 0 },
			{ dayNumber: 30, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 31, primaryCode: "Я", primaryHours: 6.0 },
		];

		const input: EmployeeTimesheetInput = {
			employeeId: "emp-101",
			employeeTabNumber: "00142",
			employeeFullName: "Смирнов Алексей Петрович",
			positionRu: "Врач-стоматолог терапевт",
			departmentRu: "Терапевтическое отделение",
			year: 2026,
			month: 8, // 31 days
			days,
		};

		const result = calculateEmployeeTimesheetT13(input);

		assert.equal(result.daysInMonth, 31);
		assert.equal(result.firstHalfSummary.daysWorked, 11);
		assert.equal(result.firstHalfSummary.regularHoursWorked, 66.0); // 11 days * 6h
		assert.equal(result.firstHalfSummary.overtimeHoursWorked, 2.0); // 2h overtime on day 2
		assert.equal(result.firstHalfSummary.totalHoursWorked, 68.0);
		assert.equal(result.firstHalfSummary.weekendDays, 4);

		// Second half (Days 16..31)
		assert.equal(result.secondHalfSummary.sickLeaveDays, 5);
		assert.equal(result.secondHalfSummary.weekendHoursWorked, 6.0); // 1 day РВ
		assert.equal(result.secondHalfSummary.daysWorked, 8); // 7 'Я' + 1 'РВ'

		// Month Total
		assert.equal(result.monthTotalSummary.daysWorked, 19);
		assert.equal(result.monthTotalSummary.overtimeHoursWorked, 2.0);
		assert.equal(result.monthTotalSummary.weekendHoursWorked, 6.0);
		assert.equal(result.monthTotalSummary.sickLeaveDays, 5);
	});

	it("1.4 Generates statutory Form T-13 CSV with UTF-8 BOM", () => {
		const input: EmployeeTimesheetInput = {
			employeeId: "emp-101",
			employeeTabNumber: "00142",
			employeeFullName: "Смирнов Алексей Петрович",
			positionRu: "Врач-стоматолог терапевт",
			departmentRu: "Терапевтическое отделение",
			year: 2026,
			month: 8,
			days: [
				{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.0 },
				{ dayNumber: 2, primaryCode: "В", primaryHours: 0 },
			],
		};

		const result = calculateEmployeeTimesheetT13(input);
		const csv = generateTimesheetT13Csv([result], "ООО «Денте Стоматология»", 2026, 8);

		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Унифицированная форма № Т-13"));
		assert.ok(csv.includes("Смирнов Алексей Петрович"));
		assert.ok(csv.includes("00142"));
		assert.ok(csv.includes("Врач-стоматолог терапевт"));
	});
});
