/**
 * DENTE Dental CRM — Wave 46 StomX & IDENT Chair-Doctor Shift Assignment Parity Test Suite
 *
 * Requirements & Standards:
 * - Feature 225: StomX Chair-Doctor Shift Assignment & Instant Duty Switcher Parity
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8k: CRM != Reality Simulator (1-click weekly presets & instant copy to next week)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 * - Mandate 8d: Apple HIG & Medical Density (compact 32-36px toolbar, touch targets >= 44x44px)
 */

import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	QuickAddChairModal,
	CHAIR_COLOR_PRESETS,
} from "../QuickAddChairModal";
import { ChairScheduleView } from "../ChairScheduleView";
import {
	rotateWeekShifts,
	copyWeekShiftsToTargetWeek,
	getMondayOfWeekIso,
	type DoctorShift,
	type StaffMember,
	type CabinetDefinition,
} from "../roster/DoctorShiftRosterModal";
import { DoctorRosterToolbar } from "../roster/DoctorRosterToolbar";
import { DoctorShiftRosterModal } from "../roster/DoctorShiftRosterModal";
import type { Dashboard } from "@dental/shared";

const mockStaff: StaffMember[] = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		shortName: "Иванов И.И.",
		role: "therapist",
		tabNumber: "001",
		isDoctor: true,
		isAssistant: false,
		weeklyHourLimit: 33,
		avatarColor: "#0d9488",
		preferredChairId: "chair-1",
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Петрович",
		shortName: "Петров П.П.",
		role: "surgeon",
		tabNumber: "002",
		isDoctor: true,
		isAssistant: false,
		weeklyHourLimit: 33,
		avatarColor: "#2563eb",
		preferredChairId: "chair-2",
	},
	{
		id: "doc-3",
		fullName: "Сидоров Сидор Сидорович",
		shortName: "Сидоров С.С.",
		role: "orthopedist",
		tabNumber: "003",
		isDoctor: true,
		isAssistant: false,
		weeklyHourLimit: 33,
		avatarColor: "#f59e0b",
		preferredChairId: "chair-1",
	},
];

const mockCabinets: CabinetDefinition[] = [
	{
		id: "cab-1",
		number: 1,
		name: "Кабинет 1 (Терапия)",
		specialty: "therapist",
		chairs: [{ id: "chair-1", name: "Кресло 1", equipment: "Установка Diplomat" }],
	},
	{
		id: "cab-2",
		number: 2,
		name: "Кабинет 2 (Хирургия)",
		specialty: "surgeon",
		chairs: [{ id: "chair-2", name: "Кресло 2", equipment: "Установка Sirona" }],
	},
];

const mockDashboard = {
	stats: {
		totalPatients: 10,
		activeTreatmentPlans: 2,
		todayAppointmentsCount: 2,
		monthRevenue: 150000,
	},
	todayAppointments: [],
	recentPatients: [],
	clinicSettings: {
		profile: {
			clinicName: "Клиника ДЕНТЕ",
			address: "г. Москва, ул. Ленина, д. 1",
			phone: "+7 495 123-45-67",
			timezone: "Europe/Moscow",
		},
		staff: [
			{
				id: "doc-1",
				fullName: "Иванов Иван Иванович",
				role: "doctor",
				specialties: ["therapist"],
				active: true,
			},
			{
				id: "doc-2",
				fullName: "Петров Петр Петрович",
				role: "doctor",
				specialties: ["surgeon"],
				active: true,
			},
			{
				id: "doc-3",
				fullName: "Сидоров Сидор Сидорович",
				role: "doctor",
				specialties: ["orthopedist"],
				active: true,
			},
		],
		chairs: [
			{
				id: "chair-1",
				name: "Кресло 1 (Терапия)",
				room: "1",
				color: "#0d9488",
				active: true,
			},
			{
				id: "chair-2",
				name: "Кресло 2 (Хирургия)",
				room: "2",
				color: "#2563eb",
				active: true,
			},
		],
	},
	patients: [],
} as unknown as Dashboard;

const mockChairAssignments: Record<string, ChairDoctorShiftAssignment> = {
	"chair-1": {
		chairId: "chair-1",
		doctorId: "doc-1",
		doctorName: "Иванов Иван Иванович",
		startHour: 8,
		endHour: 20,
		shiftHours: "08:00–20:00",
		shiftLabel: "Весь день",
	},
	"chair-2": {
		chairId: "chair-2",
		doctorId: "doc-2",
		doctorName: "Петров Петр Петрович",
		startHour: 8,
		endHour: 20,
		shiftHours: "08:00–20:00",
		shiftLabel: "Весь день",
	},
};

describe("Wave 46 — StomX & IDENT Chair-Doctor Shift Assignment Parity Suite", () => {
	describe("1. QuickAddChairModal: Autonomy, Doctor Chips & Defaults (Mandate 8e)", () => {
		it("submit button is never disabled (disabled={false}) and renders doctor chips", () => {
			const html = renderToString(
				<QuickAddChairModal
					isOpen={true}
					onClose={() => {}}
					onAddChair={() => {}}
					existingChairsCount={2}
					doctors={[
						{ id: "doc-1", fullName: "Иванов И.И." },
						{ id: "doc-2", fullName: "Петров П.П." },
					]}
				/>,
			);

			// Mandate 8e: Submit button exists and is enabled
			assert.ok(html.includes("quick-add-chair-submit-btn"), "Submit button must be rendered");
			assert.ok(!html.includes('disabled=""') || !html.includes('disabled'), "Submit button must not be disabled");

			// Doctor selection chips
			assert.ok(html.includes("quick-add-chair-doc-chip-doc-1"), "Doctor 1 chip rendered");
			assert.ok(html.includes("quick-add-chair-doc-chip-doc-2"), "Doctor 2 chip rendered");

			// 14 StomX color palettes
			for (const palette of CHAIR_COLOR_PRESETS) {
				assert.ok(
					html.includes(`quick-add-chair-color-${palette.id}`),
					`Palette ${palette.id} rendered in modal`,
				);
			}
		});
	});

	describe("2. ChairScheduleView: 1-Click Shift Presets & Copy Week to Next Week", () => {
		it("renders 1-row toolbar with copy week to next week button and shift popover trigger", () => {
			const html = renderToString(
				<ChairScheduleView
					dateKey="2026-09-08"
					appointments={[]}
					dashboard={mockDashboard}
					chairDoctorAssignments={mockChairAssignments}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onOpenRosterModal={() => {}}
				/>,
			);

			// 1-Click Copy week shifts to next week in toolbar
			assert.ok(
				html.includes("btn-copy-chair-week-next"),
				"Toolbar must include btn-copy-chair-week-next",
			);
			assert.ok(
				html.includes("На след. неделю"),
				"Toolbar must have label for copying week",
			);

			// 1-Row toolbar layout constraint (Hick's Law / Apple HIG)
			assert.ok(
				html.includes("min-h-[36px]") && html.includes("max-h-[36px]"),
				"Toolbar must enforce strictly 1-row height 36px",
			);

			// Chair doctor assignment popover trigger button
			assert.ok(
				html.includes("chair-view-assign-doctor-chair-1"),
				"Chair 1 assign doctor button rendered",
			);

			// Settings button
			assert.ok(
				html.includes("chair-view-settings-chair-1"),
				"Chair 1 settings button rendered",
			);

			// Add chair button
			assert.ok(
				html.includes("btn-add-chair-header"),
				"Add chair button rendered in header",
			);

			// Open roster button
			assert.ok(
				html.includes("btn-open-chair-roster"),
				"Open roster modal button rendered",
			);
		});
	});

	describe("3. ScheduleGrid: Duty Doctor Select, 2/2, Even/Odd & Copy Week", () => {
		it("renders instant duty doctor selector in chair header, quick pills and summary bar copy button", () => {
			const html = renderToString(
				<ScheduleGrid
					dateKey="2026-09-08"
					appointments={[]}
					dashboard={mockDashboard}
					chairDoctorAssignments={mockChairAssignments}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					patientName={() => "Тестовый Пациент"}
					formatTime={(iso) => (iso ? iso.slice(11, 16) : "10:00")}
					toDateTimeLocalValue={(iso) => (iso ? iso.slice(0, 16) : "")}
					appointmentLabels={{
						scheduled: "Запланирован",
						confirmed: "Подтвержден",
						completed: "Завершен",
						cancelled: "Отменен",
						in_chair: "В кресле",
					} as any}
				/>,
			);

			// Instant duty doctor dropdown in chair header
			assert.ok(
				html.includes("chair-duty-doctor-select-chair-1"),
				"Chair 1 header must have instant duty doctor select",
			);
			assert.ok(
				html.includes("chair-duty-doctor-select-chair-2"),
				"Chair 2 header must have instant duty doctor select",
			);

			// Popover trigger button
			assert.ok(
				html.includes("btn-chair-doctor-popover-chair-1"),
				"Chair 1 popover trigger button rendered",
			);

			// Segmented quick control button for Even/Odd
			assert.ok(
				html.includes("chair-quick-evenodd-chair-1"),
				"Chair header quick segmented control must have Even/Odd pill",
			);

			// Copy week button in daily summary bar
			assert.ok(
				html.includes("btn-grid-copy-next-week"),
				"Daily summary bar must include btn-grid-copy-next-week",
			);
		});
	});

	describe("4. DoctorShiftRosterModal: 5/2, 2/2, Even/Odd & Shift Rotation (Утро ⇄ Вечер)", () => {
		it("DoctorRosterToolbar renders rotate shifts buttons in toolbar and preset dropdown", () => {
			const html = renderToString(
				<DoctorRosterToolbar
					clinicName="ООО ДЕНТЕ"
					kpis={{
						totalWeekShifts: 10,
						totalWeeklyHours: 66,
						assistantPairingPct: 100,
						conflictCount: 0,
						errorConflictCount: 0,
					}}
					monthNormObj={{
						month: 9,
						nameRu: "Сентябрь",
						workingDays: 22,
						preHolidayDays: 0,
						holidaysAndWeekends: 8,
						normHours33: 145.2,
						normHours39: 171.6,
						normHours40: 176.0,
					}}
					activeTab="cabinets"
					onSelectTab={() => {}}
					weekStartDateIso="2026-09-07"
					weekEndDateIso="2026-09-13"
					selectedYear={2026}
					onPrevWeek={() => {}}
					onNextWeek={() => {}}
					onAutoFillDefault={() => {}}
					onApplyPreset={() => {}}
					onRotateShifts={() => {}}
					onPrintSchedule={() => {}}
					onExportT13={() => {}}
					onSaveAll={() => {}}
					onClose={() => {}}
					notification={null}
					conflicts={[]}
					staffList={mockStaff}
					cabinets={mockCabinets}
				/>,
			);

			assert.ok(
				html.includes("roster-rotate-shifts-btn"),
				"DoctorRosterToolbar action strip includes roster-rotate-shifts-btn",
			);
			assert.ok(
				html.includes("toolbar-rotate-shifts"),
				"DoctorRosterToolbar dropdown includes toolbar-rotate-shifts",
			);
		});

		it("rotateWeekShifts swaps morning (08-14) to evening (14-20) and evening to morning", () => {
			const mondayIso = "2026-09-07";
			const initialShifts: DoctorShift[] = [
				{
					id: "shift-morn",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-07",
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
					customNotes: "Утро 08:00–14:00",
				},
				{
					id: "shift-eve",
					doctorId: "doc-2",
					doctorName: "Петров П.П.",
					doctorRole: "surgeon",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-07",
					archetypeId: "evening_shift",
					startTime: "14:00",
					endTime: "20:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
					customNotes: "Вечер 14:00–20:00",
				},
			];

			const rotated = rotateWeekShifts(initialShifts, mondayIso);
			assert.strictEqual(rotated.length, 2);

			const rotatedMorn = rotated.find((s) => s.id === "shift-morn")!;
			const rotatedEve = rotated.find((s) => s.id === "shift-eve")!;

			// Morning shift rotated to evening
			assert.strictEqual(rotatedMorn.startTime, "14:00");
			assert.strictEqual(rotatedMorn.endTime, "20:00");
			assert.strictEqual(rotatedMorn.archetypeId, "evening_shift");
			assert.ok(rotatedMorn.customNotes?.includes("Вечер 14:00–20:00"));

			// Evening shift rotated to morning
			assert.strictEqual(rotatedEve.startTime, "08:00");
			assert.strictEqual(rotatedEve.endTime, "14:00");
			assert.strictEqual(rotatedEve.archetypeId, "morning_shift");
			assert.ok(rotatedEve.customNotes?.includes("Утро 08:00–14:00"));
		});

		it("rotateWeekShifts with options.chairId only rotates specified chair", () => {
			const mondayIso = "2026-09-07";
			const initialShifts: DoctorShift[] = [
				{
					id: "shift-chair1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-07",
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
				{
					id: "shift-chair2",
					doctorId: "doc-2",
					doctorName: "Петров П.П.",
					doctorRole: "surgeon",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-2",
					chairId: "chair-2",
					dateIso: "2026-09-07",
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			const rotated = rotateWeekShifts(initialShifts, mondayIso, { chairId: "chair-1" });
			const s1 = rotated.find((s) => s.id === "shift-chair1")!;
			const s2 = rotated.find((s) => s.id === "shift-chair2")!;

			// chair-1 rotated to evening
			assert.strictEqual(s1.startTime, "14:00");
			assert.strictEqual(s1.archetypeId, "evening_shift");

			// chair-2 unchanged (remained morning)
			assert.strictEqual(s2.startTime, "08:00");
			assert.strictEqual(s2.archetypeId, "morning_shift");
		});
	});
});
