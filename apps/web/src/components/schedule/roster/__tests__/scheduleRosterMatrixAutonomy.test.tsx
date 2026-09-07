/**
 * scheduleRosterMatrixAutonomy.test.tsx
 *
 * DENTE Dental CRM — Schedule Shift Matrix & 1-Click Chair-Doctor Binding Test Suite
 * Parity: StomX / DentalPRO Quick Shift Presets & Autonomy (Mandates 8e, 8k, 8n, 8d)
 *
 * Requirements:
 * - Mandate 8e: Doctor & staff autonomy — Save/Apply buttons NEVER disabled, auto-fill fallback on empty shifts.
 * - Mandate 8k: CRM != Reality Simulator — 1-click quick presets (Morning, Evening, Full Day, Day Off/Clear).
 * - Mandate 8n: Solo doctor & small clinic sovereignty (1-3 chairs).
 * - Mandate 8d / Apple HIG: Touch targets >= 44px across all interactive controls.
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
	applyCellShiftPreset,
} = await import("../DoctorShiftRosterModal");

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

describe("Schedule Shift Matrix & 1-Click Chair-Doctor Binding Autonomy (Mandates 8e, 8k, 8n)", () => {
	describe("Mandate 8e: Doctor Autonomy & Non-Blocking Roster Actions", () => {
		it("Save and Apply buttons are NEVER disabled even when initial shifts array is empty", () => {
			const html = renderToStaticMarkup(
				<DoctorShiftRosterModal
					isOpen={true}
					onClose={() => {}}
					cabinets={TEST_CABINETS}
					staffList={TEST_STAFF}
					initialShifts={[]}
					onSave={() => {}}
				/>,
			);

			// Check save button is rendered and disabled attribute is absent
			assert.match(html, /data-testid="roster-save-btn"/);
			assert.doesNotMatch(
				html,
				/data-testid="roster-save-btn"[^>]*disabled/,
				"Save button must not be disabled on empty shifts (Mandate 8e)",
			);

			// Check apply and close button is rendered and disabled attribute is absent
			assert.match(html, /data-testid="roster-apply-close-btn"/);
			assert.doesNotMatch(
				html,
				/data-testid="roster-apply-close-btn"[^>]*disabled/,
				"Apply & Close button must not be disabled on empty shifts (Mandate 8e)",
			);
		});

		it("Enforces minimum touch target of 44px on primary modal buttons (Apple HIG / Mandate 8d)", () => {
			const html = renderToStaticMarkup(
				<DoctorShiftRosterModal
					isOpen={true}
					onClose={() => {}}
					cabinets={TEST_CABINETS}
					staffList={TEST_STAFF}
					initialShifts={[]}
					onSave={() => {}}
				/>,
			);

			// Roster save button touch target
			assert.match(html, /data-testid="roster-save-btn"[^>]*min-height:\s*44px/);
			// Roster apply button touch target
			assert.match(html, /data-testid="roster-apply-close-btn"[^>]*min-height:\s*44px/);
		});
	});

	describe("1-Click Shift Presets Pure Engine: applyCellShiftPreset (Mandates 8k, 8n)", () => {
		const baseDate = "2026-09-08";

		it("applies 'morning' preset (08:00–14:00, 6.0 hours, morning_shift)", () => {
			const initial: DoctorShift[] = [];
			const result = applyCellShiftPreset(initial, {
				dateIso: baseDate,
				cabinetId: "cab-1",
				chairId: "chair-1",
				presetType: "morning",
				doctorId: "doc-1",
				staffList: TEST_STAFF,
				cabinets: TEST_CABINETS,
			});

			assert.strictEqual(result.length, 1);
			const shift = result[0]!;
			assert.strictEqual(shift.startTime, "08:00");
			assert.strictEqual(shift.endTime, "14:00");
			assert.strictEqual(shift.durationHours, 6.0);
			assert.strictEqual(shift.archetypeId, "morning_shift");
			assert.strictEqual(shift.doctorId, "doc-1");
			assert.strictEqual(shift.doctorName, "Иванов И.И.");
			assert.strictEqual(shift.status, "scheduled");
			assert.strictEqual(shift.chairId, "chair-1");
			assert.strictEqual(shift.cabinetId, "cab-1");
		});

		it("applies 'evening' preset (14:00–20:00, 6.0 hours, evening_shift)", () => {
			const initial: DoctorShift[] = [];
			const result = applyCellShiftPreset(initial, {
				dateIso: baseDate,
				cabinetId: "cab-1",
				chairId: "chair-2",
				presetType: "evening",
				doctorId: "doc-2",
				staffList: TEST_STAFF,
				cabinets: TEST_CABINETS,
			});

			assert.strictEqual(result.length, 1);
			const shift = result[0]!;
			assert.strictEqual(shift.startTime, "14:00");
			assert.strictEqual(shift.endTime, "20:00");
			assert.strictEqual(shift.durationHours, 6.0);
			assert.strictEqual(shift.archetypeId, "evening_shift");
			assert.strictEqual(shift.doctorId, "doc-2");
			assert.strictEqual(shift.doctorName, "Петрова А.С.");
			assert.strictEqual(shift.status, "scheduled");
		});

		it("applies 'full_day' preset (08:00–20:00, 11.0 working hours, 60min break)", () => {
			const initial: DoctorShift[] = [];
			const result = applyCellShiftPreset(initial, {
				dateIso: baseDate,
				cabinetId: "cab-2",
				chairId: "chair-3",
				presetType: "full_day",
				doctorId: "doc-1",
				staffList: TEST_STAFF,
				cabinets: TEST_CABINETS,
			});

			assert.strictEqual(result.length, 1);
			const shift = result[0]!;
			assert.strictEqual(shift.startTime, "08:00");
			assert.strictEqual(shift.endTime, "20:00");
			assert.strictEqual(shift.durationHours, 11.0);
			assert.strictEqual(shift.breakMinutes, 60);
			assert.strictEqual(shift.status, "scheduled");
		});

		it("applies 'clear' preset to cancel/remove existing shift for that cell (day off)", () => {
			const initial: DoctorShift[] = [
				{
					id: "shift-existing-1",
					cabinetId: "cab-1",
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					dateIso: baseDate,
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6,
					breakMinutes: 0,
					archetypeId: "morning_shift",
					status: "confirmed",
					isNight: false,
					nightHours: 0,
					assistantId: null,
					assistantName: null,
				},
				{
					id: "shift-other-chair",
					cabinetId: "cab-1",
					chairId: "chair-2",
					doctorId: "doc-2",
					doctorName: "Петрова А.С.",
					doctorRole: "surgeon",
					dateIso: baseDate,
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6,
					breakMinutes: 0,
					archetypeId: "morning_shift",
					status: "confirmed",
					isNight: false,
					nightHours: 0,
					assistantId: null,
					assistantName: null,
				},
			];

			const result = applyCellShiftPreset(initial, {
				dateIso: baseDate,
				cabinetId: "cab-1",
				chairId: "chair-1",
				presetType: "clear",
				doctorId: "doc-1",
				staffList: TEST_STAFF,
				cabinets: TEST_CABINETS,
			});

			// Only shift-other-chair remains active
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0]!.id, "shift-other-chair");
			assert.strictEqual(result[0]!.chairId, "chair-2");
		});

		it("overwrites existing shift cleanly in the same chair/date without duplicates", () => {
			const initial: DoctorShift[] = [
				{
					id: "shift-old",
					cabinetId: "cab-1",
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					dateIso: baseDate,
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6,
					breakMinutes: 0,
					archetypeId: "morning_shift",
					status: "confirmed",
					isNight: false,
					nightHours: 0,
					assistantId: null,
					assistantName: null,
				},
			];

			// Doctor switches from morning to evening
			const result = applyCellShiftPreset(initial, {
				dateIso: baseDate,
				cabinetId: "cab-1",
				chairId: "chair-1",
				presetType: "evening",
				doctorId: "doc-1",
				staffList: TEST_STAFF,
				cabinets: TEST_CABINETS,
			});

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0]!.startTime, "14:00");
			assert.strictEqual(result[0]!.endTime, "20:00");
			assert.strictEqual(result[0]!.archetypeId, "evening_shift");
		});

		it("resiliently handles solo doctor on 1 chair without assistant (Mandate 8n)", () => {
			const soloStaff: StaffMember[] = [
				{
					id: "solo-doc",
					fullName: "Соло Врач",
					shortName: "Соло В.",
					role: "therapist",
					avatarColor: "#0ea5e9",
					tabNumber: "001",
					weeklyHourLimit: 33,
					isDoctor: true,
					isAssistant: false,
				},
			];
			const soloCabinets: CabinetDefinition[] = [
				{
					id: "solo-cab",
					number: 1,
					name: "Кабинет",
					specialty: "Общая",
					chairs: [{ id: "solo-chair", name: "Кресло", equipment: "Установка" }],
				},
			];

			const result = applyCellShiftPreset([], {
				dateIso: "2026-09-10",
				cabinetId: "solo-cab",
				chairId: "solo-chair",
				presetType: "full_day",
				staffList: soloStaff,
				cabinets: soloCabinets,
			});

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0]!.doctorId, "solo-doc");
			assert.strictEqual(result[0]!.doctorName, "Соло В.");
			assert.strictEqual(result[0]!.durationHours, 11.0);
			assert.strictEqual(result[0]!.status, "scheduled");
		});
	});

	describe("DoctorRosterMatrix: 1-Click Fast Shift Popover Rendering & Touch Targets", () => {
		const weekDays = [
			{ dateIso: "2026-09-07", dayName: "Пн", dayNumber: "07", isWeekend: false },
			{ dateIso: "2026-09-08", dayName: "Вт", dayNumber: "08", isWeekend: false },
			{ dateIso: "2026-09-09", dayName: "Ср", dayNumber: "09", isWeekend: false },
			{ dateIso: "2026-09-10", dayName: "Чт", dayNumber: "10", isWeekend: false },
			{ dateIso: "2026-09-11", dayName: "Пт", dayNumber: "11", isWeekend: false },
			{ dateIso: "2026-09-12", dayName: "Сб", dayNumber: "12", isWeekend: true },
			{ dateIso: "2026-09-13", dayName: "Вс", dayNumber: "13", isWeekend: true },
		];

		it("renders quick popover overlay with all 4 presets when activePopoverCell is provided", () => {
			const html = renderToStaticMarkup(
				<DoctorRosterMatrix
					activeTab="cabinets"
					weekDays={weekDays}
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

			// Popover dialog exists
			assert.match(html, /data-testid="roster-cell-popover"/);

			// 4 Presets exist
			assert.match(html, /data-testid="cell-preset-morning"/);
			assert.match(html, /data-testid="cell-preset-evening"/);
			assert.match(html, /data-testid="cell-preset-full-day"/);
			assert.match(html, /data-testid="cell-preset-clear"/);

			// Selectors exist
			assert.match(html, /data-testid="popover-doctor-select"/);
			assert.match(html, /data-testid="popover-chair-select"/);

			// Full edit button exists
			assert.match(html, /data-testid="popover-full-edit-btn"/);
		});

		it("all preset buttons in popover have touch target >= 44px (Mandate 8d)", () => {
			const html = renderToStaticMarkup(
				<DoctorRosterMatrix
					activeTab="cabinets"
					weekDays={weekDays}
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
			assert.match(html, /data-testid="popover-doctor-select"[^>]*min-height:\s*44px/);
			assert.match(html, /data-testid="popover-chair-select"[^>]*min-height:\s*44px/);
			assert.match(html, /data-testid="popover-full-edit-btn"[^>]*min-height:\s*44px/);
		});

		it("renders doctors view with 1-click popover add button and valid CSS variable background", () => {
			const html = renderToStaticMarkup(
				<DoctorRosterMatrix
					activeTab="doctors"
					weekDays={weekDays}
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
				/>,
			);

			// Progress bar should not have hardcoded #e2e8f0 in doctors view
			assert.doesNotMatch(html, /background:\s*#e2e8f0/);
			assert.match(html, /var\(--line,\s*#334155\)/);

			// Add buttons rendered for empty doctor days with >=44px touch target
			assert.match(html, /class="roster-cell-add-btn"[^>]*min-height:\s*44px/);
		});
	});
});
