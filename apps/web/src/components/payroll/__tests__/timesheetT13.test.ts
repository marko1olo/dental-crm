/**
 * timesheetT13.test.ts — Unit tests for Form T-13 Statutory Timesheet Modal calculations and exports.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateEmployeeTimesheetT13,
	generateTimesheetT13Csv,
	getDaysInMonth,
	type TimesheetDayRecord,
	type EmployeeTimesheetInput,
} from "@dental/shared";

describe("Form T-13 Statutory Timesheet Web Integration", () => {
	it("2.1 Computes standard doctor schedule with split halves correctly", () => {
		const days: TimesheetDayRecord[] = [];
		for (let d = 1; d <= 31; d++) {
			const isWeekend = d % 7 === 6 || d % 7 === 0;
			days.push({
				dayNumber: d,
				primaryCode: isWeekend ? "В" : "Я",
				primaryHours: isWeekend ? 0 : 6.0,
			});
		}

		const input: EmployeeTimesheetInput = {
			employeeId: "emp-1",
			employeeTabNumber: "00101",
			employeeFullName: "Смирнов Алексей Петрович",
			positionRu: "Врач-стоматолог терапевт",
			departmentRu: "Терапевтическое отделение",
			year: 2026,
			month: 8,
			days,
		};

		const res = calculateEmployeeTimesheetT13(input);
		assert.equal(res.daysInMonth, 31);
		assert.ok(res.firstHalfSummary.daysWorked > 0);
		assert.ok(res.secondHalfSummary.daysWorked > 0);
		assert.equal(
			res.monthTotalSummary.daysWorked,
			res.firstHalfSummary.daysWorked + res.secondHalfSummary.daysWorked,
		);
		assert.equal(
			res.monthTotalSummary.totalHoursWorked,
			res.firstHalfSummary.totalHoursWorked + res.secondHalfSummary.totalHoursWorked,
		);
	});

	it("2.2 Generates compliant Form T-13 CSV string with correct formatting", () => {
		const input: EmployeeTimesheetInput = {
			employeeId: "emp-2",
			employeeTabNumber: "00102",
			employeeFullName: "Васильев Максим Сергеевич",
			positionRu: "Врач-стоматолог ортопед",
			departmentRu: "Ортопедическое отделение",
			year: 2026,
			month: 8,
			days: [{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.0 }],
		};

		const res = calculateEmployeeTimesheetT13(input);
		const csv = generateTimesheetT13Csv([res], "ООО «Денте Стоматология»", 2026, 8);

		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Унифицированная форма № Т-13"));
		assert.ok(csv.includes("Васильев Максим Сергеевич"));
	});
});
