/**
 * doctorShiftRosterWave44.test.tsx
 *
 * DENTE Dental CRM — Wave 44: Schedule & Chair Shift Roster Ergonomics Test Suite
 * Mandates 8d, 8e, 8k, 8n (THE HAMMER SUPREME LAW)
 *
 * Requirements:
 * 1. Anti-Matryoshka Modal Law (Mandate 8d p. 6):
 *    - Modal nesting depth is strictly 1: cell popover is anchored (.roster-cell-popover-anchored), NOT a full-screen blocking overlay.
 *    - roster-cell-popover-overlay with fixed inset-0 and rgba(15, 23, 42, 0.5) backdrop is completely eliminated.
 *    - All 4 quick shift presets (Morning, Evening, Full Day, Clear) + weekly templates (including cell-template-daily-morning) exist.
 * 2. Medical Desktop Toolbar Density & Ergonomics:
 *    - Year "(2026)" removed from header title -> "График сменности и табель учета врачей".
 *    - Auxiliary toolbar buttons have 34px height (touch targets >= 44px reserved for primary save actions).
 *    - Primary save button retains 44px touch target.
 * 3. Batch Chair Assignment & Toolbar Selectors:
 *    - Toolbar features dedicated doctor select (toolbar-doctor-select) and chair select (toolbar-chair-select).
 *    - Quick template buttons in toolbar (2/2, Пн-Ср-Пт, Вт-Чт-Сб, Каждый день утро).
 *    - doctorWeeklyScheduleGenerator generates correct shifts for daily_morning template.
 * 4. Outpatient Conflict Engine & Doctor Autonomy (Mandate 8e, 8i):
 *    - Private outpatient practice suppresses false warnings for surgery without assistant and weekly overtime >33h (ст. 350 ТК РФ).
 *    - Real double-booking conflicts (same doctor or chair overlap) remain active and blocking.
 *    - Legacy calls without options remain backward compatible.
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";

if (typeof registerHooks === "function") {
	try {
		registerHooks({
			load(url, context, nextLoad) {
				if (url.endsWith(".css")) {
					return {
						format: "module",
						shortCircuit: true,
						source: "export default {};",
					};
				}
				return nextLoad(url, context);
			},
		});
	} catch {
		// Ignore if already registered
	}
}

const {
	DoctorShiftRosterModal,
	DoctorRosterMatrix,
	DoctorRosterToolbar,
} = await import("../DoctorShiftRosterModal");

import {
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
} from "../doctorShiftRosterPresets";

import {
	applyDoctorChairWeeklyTemplate,
} from "../doctorWeeklyScheduleGenerator";

import { detectRosterConflicts } from "../doctorShiftRosterEngine";

import type {
	CabinetDefinition,
	DoctorShift,
	StaffMember,
} from "../DoctorShiftRosterModal";

const TEST_CABINETS: CabinetDefinition[] = [
	{
		id: "cab-1",
		number: 1,
		name: "Кабинет 1 (Хирургия)",
		specialty: "Хирургия",
		chairs: [
			{ id: "chair-1", name: "Кресло 1 (Sirona)", equipment: "Микроскоп, Physiodispenser" },
			{ id: "chair-2", name: "Кресло 2 (Kavo)", equipment: "Визиограф" },
		],
	},
	{
		id: "cab-2",
		number: 2,
		name: "Кабинет 2 (Терапия)",
		specialty: "Терапия",
		chairs: [
			{ id: "chair-3", name: "Кресло 3 (A-dec)", equipment: "Эндодонтический мотор" },
		],
	},
];

const TEST_STAFF: StaffMember[] = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		shortName: "Иванов И.И.",
		role: "therapist",
		avatarColor: "#0ea5e9",
		tabNumber: "001",
		weeklyHourLimit: 33,
		preferredChairId: "chair-1",
		isDoctor: true,
		isAssistant: false,
	},
	{
		id: "doc-2",
		fullName: "Петрова Анна Сергеевна",
		shortName: "Петрова А.С.",
		role: "surgeon",
		avatarColor: "#10b981",
		tabNumber: "002",
		weeklyHourLimit: 33,
		preferredChairId: "chair-2",
		isDoctor: true,
		isAssistant: false,
	},
	{
		id: "asst-1",
		fullName: "Сидорова Мария Павловна",
		shortName: "Сидорова М.П.",
		role: "assistant",
		avatarColor: "#8b5cf6",
		tabNumber: "003",
		weeklyHourLimit: 39,
		isDoctor: false,
		isAssistant: true,
	},
];

const TEST_WEEK_DAYS = [
	{ dateIso: "2026-09-07", dayName: "Пн", dayNumber: "07", isWeekend: false },
	{ dateIso: "2026-09-08", dayName: "Вт", dayNumber: "08", isWeekend: false },
	{ dateIso: "2026-09-09", dayName: "Ср", dayNumber: "09", isWeekend: false },
	{ dateIso: "2026-09-10", dayName: "Чт", dayNumber: "10", isWeekend: false },
	{ dateIso: "2026-09-11", dayName: "Пт", dayNumber: "11", isWeekend: false },
	{ dateIso: "2026-09-12", dayName: "Сб", dayNumber: "12", isWeekend: true },
	{ dateIso: "2026-09-13", dayName: "Вс", dayNumber: "13", isWeekend: true },
];

describe("Wave 44: Schedule & Chair Shift Roster Ergonomics", () => {
	describe("1. Anti-Matryoshka Modal Law (Mandate 8d p. 6 & Mandate 8e)", () => {
		it("eliminates fullscreen overlay (roster-cell-popover-overlay) and renders anchored popover", () => {
			const html = renderToStaticMarkup(
				<DoctorRosterMatrix
					activeTab="cabinets"
					weekDays={TEST_WEEK_DAYS}
					weekStartDateIso="2026-09-07"
					weekEndDateIso="2026-09-13"
					selectedYear={2026}
					selectedMonth={8}
					cabinets={TEST_CABINETS}
					staffList={TEST_STAFF}
					shifts={[]}
					conflicts={[]}
					t13Matrix={[]}
					sanitizedAppointments={[]}
					onOpenEdit={() => {}}
					onOpenCreateInCell={() => {}}
					onOpenT13Timesheet={() => {}}
					onOpenInternalT13Modal={() => {}}
					onExportT13={() => {}}
					onClose={() => {}}
					activePopoverCell={{
						dateIso: "2026-09-08",
						cabinetId: "cab-1",
						chairId: "chair-1",
						doctorId: "doc-1",
					}}
				/>,
			);

			// Must NOT contain the old blocking backdrop with fixed inset-0
			assert.doesNotMatch(
				html,
				/roster-cell-popover-overlay/,
				"Blocking full-screen overlay class must be removed to avoid Matryoshka depth > 1",
			);
			assert.doesNotMatch(
				html,
				/rgba\(15,\s*23,\s*42,\s*0\.5\)/,
				"Dark blocking backdrop rgba(15, 23, 42, 0.5) must be removed",
			);

			// Must contain anchored popover container with absolute positioning
			assert.match(
				html,
				/class="[^"]*roster-cell-popover-anchored[^"]*"/,
				"Anchored popover class must be used instead of overlay",
			);
			assert.match(html, /data-testid="roster-cell-popover"/);
			assert.match(html, /position:\s*absolute/);

			// Presets exist inside popover
			assert.match(html, /data-testid="cell-preset-morning"/);
			assert.match(html, /data-testid="cell-preset-evening"/);
			assert.match(html, /data-testid="cell-preset-full-day"/);
			assert.match(html, /data-testid="cell-preset-clear"/);

			// New weekly template 'daily_morning' exists inside cell popover
			assert.match(html, /data-testid="cell-template-daily-morning"/);

			// Selectors and edit button exist
			assert.match(html, /data-testid="popover-doctor-select"/);
			assert.match(html, /data-testid="popover-chair-select"/);
			assert.match(html, /data-testid="popover-full-edit-btn"/);
		});

		it("maintains touch targets >= 44px inside popover for glove/touch operation (Mandate 8d)", () => {
			const html = renderToStaticMarkup(
				<DoctorRosterMatrix
					activeTab="cabinets"
					weekDays={TEST_WEEK_DAYS}
					weekStartDateIso="2026-09-07"
					weekEndDateIso="2026-09-13"
					selectedYear={2026}
					selectedMonth={8}
					cabinets={TEST_CABINETS}
					staffList={TEST_STAFF}
					shifts={[]}
					conflicts={[]}
					t13Matrix={[]}
					sanitizedAppointments={[]}
					onOpenEdit={() => {}}
					onOpenCreateInCell={() => {}}
					onOpenT13Timesheet={() => {}}
					onOpenInternalT13Modal={() => {}}
					onExportT13={() => {}}
					onClose={() => {}}
					activePopoverCell={{
						dateIso: "2026-09-08",
						cabinetId: "cab-1",
						chairId: "chair-1",
						doctorId: "doc-1",
					}}
				/>,
			);

			assert.match(html, /data-testid="cell-preset-morning"[^>]*min-height:\s*44px/);
			assert.match(html, /data-testid="cell-preset-evening"[^>]*min-height:\s*44px/);
			assert.match(html, /data-testid="cell-preset-full-day"[^>]*min-height:\s*44px/);
			assert.match(html, /data-testid="cell-preset-clear"[^>]*min-height:\s*44px/);
			assert.match(html, /data-testid="cell-template-daily-morning"[^>]*min-height:\s*44px/);
			assert.match(html, /data-testid="popover-doctor-select"[^>]*min-height:\s*44px/);
			assert.match(html, /data-testid="popover-chair-select"[^>]*min-height:\s*44px/);
		});
	});

	describe("2. Medical Desktop Toolbar Density & Ergonomics", () => {
		it("removes redundant '(2026)' from title and renders clean medical header", () => {
			const html = renderToStaticMarkup(
				<DoctorRosterToolbar
					selectedYear={2026}
					activeTab="cabinets"
					onSelectTab={() => {}}
					weekStartDateIso="2026-09-07"
					weekEndDateIso="2026-09-13"
					onPrevWeek={() => {}}
					onNextWeek={() => {}}
					onAutoFillDefault={() => {}}
					onApplyPreset={() => {}}
					onCopyWeekToNextWeek={() => {}}
					onCopyWeekToMonth={() => {}}
					onClearWeek={() => {}}
					onPrintSchedule={() => {}}
					onExportT13={() => {}}
					onSaveAll={() => {}}
					onClose={() => {}}
					notification={null}
					conflicts={[]}
					kpis={{
						totalWeekShifts: 10,
						totalWeeklyHours: 60,
						assistantPairingPct: 100,
						conflictCount: 0,
						errorConflictCount: 0,
					}}
					staffList={TEST_STAFF}
					cabinets={TEST_CABINETS}
				/>,
			);

			assert.match(html, /График сменности и табель учета врачей/);
			assert.doesNotMatch(html, /График сменности и табель учета врачей\s*\(2026\)/);
		});

		it("sets auxiliary buttons height to 34px while primary save button maintains 44px", () => {
			const html = renderToStaticMarkup(
				<DoctorRosterToolbar
					selectedYear={2026}
					activeTab="cabinets"
					onSelectTab={() => {}}
					weekStartDateIso="2026-09-07"
					weekEndDateIso="2026-09-13"
					onPrevWeek={() => {}}
					onNextWeek={() => {}}
					onAutoFillDefault={() => {}}
					onApplyPreset={() => {}}
					onCopyWeekToNextWeek={() => {}}
					onCopyWeekToMonth={() => {}}
					onClearWeek={() => {}}
					onPrintSchedule={() => {}}
					onExportT13={() => {}}
					onSaveAll={() => {}}
					onClose={() => {}}
					notification={null}
					conflicts={[]}
					kpis={{
						totalWeekShifts: 10,
						totalWeeklyHours: 60,
						assistantPairingPct: 100,
						conflictCount: 0,
						errorConflictCount: 0,
					}}
					staffList={TEST_STAFF}
					cabinets={TEST_CABINETS}
				/>,
			);

			// Auxiliary buttons: 34px height
			assert.match(html, /title="Предыдущая неделя"/);
			assert.match(html, /title="Следующая неделя"/);
			assert.match(html, /height:\s*34px[^>]*title="Заполнить неделю стандартным шаблоном смен"/);

			// Primary save button: 44px touch target
			assert.match(html, /data-testid="roster-save-btn"[^>]*min-height:\s*44px/);
		});
	});

	describe("3. Batch Chair Assignment Bug Fix & Toolbar Selectors", () => {
		it("renders toolbar-doctor-select and toolbar-chair-select when template handler is provided", () => {
			const html = renderToStaticMarkup(
				<DoctorRosterToolbar
					selectedYear={2026}
					activeTab="cabinets"
					onSelectTab={() => {}}
					weekStartDateIso="2026-09-07"
					weekEndDateIso="2026-09-13"
					onPrevWeek={() => {}}
					onNextWeek={() => {}}
					onAutoFillDefault={() => {}}
					onApplyPreset={() => {}}
					onApplyDoctorChairWeeklyTemplate={() => {}}
					onCopyWeekToNextWeek={() => {}}
					onCopyWeekToMonth={() => {}}
					onClearWeek={() => {}}
					onPrintSchedule={() => {}}
					onExportT13={() => {}}
					onSaveAll={() => {}}
					onClose={() => {}}
					notification={null}
					conflicts={[]}
					kpis={{
						totalWeekShifts: 10,
						totalWeeklyHours: 60,
						assistantPairingPct: 100,
						conflictCount: 0,
						errorConflictCount: 0,
					}}
					staffList={TEST_STAFF}
					cabinets={TEST_CABINETS}
				/>,
			);

			assert.match(html, /data-testid="toolbar-doctor-select"/);
			assert.match(html, /data-testid="toolbar-chair-select"/);
			assert.match(html, /data-testid="toolbar-template-two-two"/);
			assert.match(html, /data-testid="toolbar-template-mon-wed-fri"/);
			assert.match(html, /data-testid="toolbar-template-tue-thu-sat"/);
			assert.match(html, /data-testid="toolbar-template-daily-morning"/);
		});

		it("doctorWeeklyScheduleGenerator generates correct daily_morning shifts", () => {
			const shifts = applyDoctorChairWeeklyTemplate([], {
				templateId: "daily_morning",
				weekStartDateIso: "2026-09-07",
				doctorId: "doc-1",
				cabinetId: "cab-1",
				chairId: "chair-1",
				staffList: TEST_STAFF,
				cabinets: TEST_CABINETS,
			});

			// Mon-Sat: 6 shifts
			assert.strictEqual(shifts.length, 6);
			for (const shift of shifts) {
				assert.strictEqual(shift.doctorId, "doc-1");
				assert.strictEqual(shift.cabinetId, "cab-1");
				assert.strictEqual(shift.chairId, "chair-1");
				assert.strictEqual(shift.startTime, "08:00");
				assert.strictEqual(shift.endTime, "14:00");
				assert.strictEqual(shift.durationHours, 6.0);
				assert.strictEqual(shift.archetypeId, "morning_shift");
				assert.strictEqual(shift.status, "scheduled");
			}

			// Sunday should not have a shift
			const sundayShift = shifts.find((s) => s.dateIso === "2026-09-13");
			assert.strictEqual(sundayShift, undefined);
		});
	});

	describe("4. Outpatient Conflict Rules & Mandate 8e Autonomy", () => {
		it("suppresses surgery assistant and statutory 33h overtime warnings for private outpatient practice", () => {
			// Create a surgeon shift without an assistant and 36 hours total (exceeding 33h)
			const shifts: DoctorShift[] = [
				{
					id: "s1",
					cabinetId: "cab-1", // Surgery cabinet
					chairId: "chair-1",
					doctorId: "doc-2", // Surgeon
					doctorName: "Петрова А.С.",
					doctorRole: "surgeon",
					dateIso: "2026-09-07",
					startTime: "08:00",
					endTime: "20:00",
					durationHours: 12,
					breakMinutes: 0,
					archetypeId: "morning_shift",
					status: "scheduled",
					isNight: false,
					nightHours: 0,
					assistantId: null, // NO assistant
					assistantName: null,
				},
				{
					id: "s2",
					cabinetId: "cab-1",
					chairId: "chair-1",
					doctorId: "doc-2",
					doctorName: "Петрова А.С.",
					doctorRole: "surgeon",
					dateIso: "2026-09-08",
					startTime: "08:00",
					endTime: "20:00",
					durationHours: 12,
					breakMinutes: 0,
					archetypeId: "morning_shift",
					status: "scheduled",
					isNight: false,
					nightHours: 0,
					assistantId: null,
					assistantName: null,
				},
				{
					id: "s3",
					cabinetId: "cab-1",
					chairId: "chair-1",
					doctorId: "doc-2",
					doctorName: "Петрова А.С.",
					doctorRole: "surgeon",
					dateIso: "2026-09-09",
					startTime: "08:00",
					endTime: "20:00",
					durationHours: 12,
					breakMinutes: 0,
					archetypeId: "morning_shift",
					status: "scheduled",
					isNight: false,
					nightHours: 0,
					assistantId: null,
					assistantName: null,
				},
			];

			// Private outpatient practice: warnings should be suppressed
			const outpatientConflicts = detectRosterConflicts(shifts, TEST_STAFF, {
				practiceType: "private_outpatient",
			});

			const hasSurgeryWarning = outpatientConflicts.some(
				(c) => c.type === "no_assistant_for_surgery",
			);
			const hasOvertimeWarning = outpatientConflicts.some(
				(c) => c.type === "weekly_overtime_tk_rf",
			);

			assert.strictEqual(
				hasSurgeryWarning,
				false,
				"Surgery without assistant warning must be suppressed in private outpatient practice",
			);
			assert.strictEqual(
				hasOvertimeWarning,
				false,
				"Weekly overtime warning >33h must be suppressed in private outpatient practice",
			);

			// Legacy / statutory check: warnings should appear
			const statutoryConflicts = detectRosterConflicts(shifts, TEST_STAFF, {
				practiceType: "hospital_statutory",
				checkSurgeryAssistant: true,
				checkWeeklyOvertime: true,
			});

			const statutorySurgeryWarning = statutoryConflicts.some(
				(c) => c.type === "no_assistant_for_surgery",
			);
			const statutoryOvertimeWarning = statutoryConflicts.some(
				(c) => c.type === "weekly_overtime_tk_rf",
			);

			assert.strictEqual(statutorySurgeryWarning, true);
			assert.strictEqual(statutoryOvertimeWarning, true);
		});

		it("still detects blocking double-booking conflicts even in private outpatient practice", () => {
			// Two shifts for the same doctor at overlapping times on different chairs
			const overlappingShifts: DoctorShift[] = [
				{
					id: "s1",
					cabinetId: "cab-1",
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					dateIso: "2026-09-07",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6,
					breakMinutes: 0,
					archetypeId: "morning_shift",
					status: "scheduled",
					isNight: false,
					nightHours: 0,
					assistantId: null,
					assistantName: null,
				},
				{
					id: "s2",
					cabinetId: "cab-2",
					chairId: "chair-3",
					doctorId: "doc-1", // SAME doctor
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					dateIso: "2026-09-07",
					startTime: "10:00", // OVERLAP
					endTime: "16:00",
					durationHours: 6,
					breakMinutes: 0,
					archetypeId: "morning_shift",
					status: "scheduled",
					isNight: false,
					nightHours: 0,
					assistantId: null,
					assistantName: null,
				},
			];

			const conflicts = detectRosterConflicts(
				overlappingShifts,
				TEST_STAFF,
				{ practiceType: "private_outpatient" },
			);

			const doubleBooking = conflicts.find((c) => c.type === "doctor_double_booking");
			assert.ok(doubleBooking, "Doctor double booking must be detected as a conflict");
			assert.strictEqual(doubleBooking.severity, "error");
		});
	});
});
