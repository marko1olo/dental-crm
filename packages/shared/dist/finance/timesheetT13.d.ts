/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Statutory Form T-13 Timesheet Engine (Госкомстат РФ № 1)
 *
 * Implements:
 * 1. Unified Form No. T-13 ("Табель учета рабочего времени", Постановление Госкомстата РФ от 05.01.2004 № 1).
 * 2. Statutory Russian attendance/absence codes (Я, Н, РВ, С, В, ОТ, Б, ДО, ПР, etc.).
 * 3. Daily shift accounting (1..31 days) with dual code/hours cells (e.g. Я / 6.0, С / 2.0).
 * 4. Half-month and full-month aggregations (days, regular hours, overtime, night hours, weekend hours, absences).
 * 5. Form T-13 CSV / TSV export with UTF-8 BOM for 1C:ZUP and Excel interoperability.
 * ═══════════════════════════════════════════════════════════════════════════
 */
/**
 * Statutory Russian State Statistics Committee (Госкомстат) attendance & absence codes
 */
export type TimesheetCode = "Я" | "Н" | "РВ" | "С" | "В" | "ОТ" | "ОД" | "У" | "Б" | "Т" | "ДО" | "ПР" | "К" | "ПК";
export interface TimesheetCodeMetadata {
    readonly letterCode: TimesheetCode;
    readonly digitalCode: string;
    readonly descriptionRu: string;
    readonly isWorkTime: boolean;
    readonly isPaidAbsence: boolean;
}
export declare const TIMESHEET_STATUTORY_CODES: Record<TimesheetCode, TimesheetCodeMetadata>;
/**
 * Daily record for an employee in Form T-13
 */
export interface TimesheetDayRecord {
    readonly dayNumber: number;
    readonly primaryCode: TimesheetCode;
    readonly primaryHours: number;
    readonly secondaryCode?: TimesheetCode | undefined;
    readonly secondaryHours?: number | undefined;
}
/**
 * Employee timesheet input for a single month
 */
export interface EmployeeTimesheetInput {
    readonly employeeId: string;
    readonly employeeTabNumber: string;
    readonly employeeFullName: string;
    readonly positionRu: string;
    readonly departmentRu: string;
    readonly year: number;
    readonly month: number;
    readonly days: readonly TimesheetDayRecord[];
}
/**
 * Summary totals for half-month or full month
 */
export interface TimesheetPeriodSummary {
    readonly daysWorked: number;
    readonly regularHoursWorked: number;
    readonly nightHoursWorked: number;
    readonly overtimeHoursWorked: number;
    readonly weekendHoursWorked: number;
    readonly totalHoursWorked: number;
    readonly vacationDays: number;
    readonly sickLeaveDays: number;
    readonly unpaidLeaveDays: number;
    readonly weekendDays: number;
    readonly absenceDaysTotal: number;
}
/**
 * Full calculated result for an employee timesheet
 */
export interface EmployeeTimesheetResult {
    readonly employeeId: string;
    readonly employeeTabNumber: string;
    readonly employeeFullName: string;
    readonly positionRu: string;
    readonly departmentRu: string;
    readonly year: number;
    readonly month: number;
    readonly daysInMonth: number;
    readonly dailyRecords: readonly TimesheetDayRecord[];
    readonly firstHalfSummary: TimesheetPeriodSummary;
    readonly secondHalfSummary: TimesheetPeriodSummary;
    readonly monthTotalSummary: TimesheetPeriodSummary;
}
/**
 * Calculates number of days in a given year and month (1-indexed).
 */
export declare function getDaysInMonth(year: number, month: number): number;
/**
 * Aggregates a range of days into period summary totals.
 */
export declare function aggregateTimesheetDays(days: readonly TimesheetDayRecord[], startDay: number, endDay: number): TimesheetPeriodSummary;
/**
 * Computes full Form T-13 timesheet for an employee.
 */
export declare function calculateEmployeeTimesheetT13(input: EmployeeTimesheetInput): EmployeeTimesheetResult;
/**
 * Generates official Russian Form T-13 CSV file string with UTF-8 BOM.
 */
export declare function generateTimesheetT13Csv(results: readonly EmployeeTimesheetResult[], clinicName?: string, year?: number, month?: number): string;
