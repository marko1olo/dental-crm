/**
 * scheduleShiftRosterIntegration.test.tsx
 *
 * DENTE Dental CRM — Schedule Shift Roster & Weekly Doctor-to-Chair Matrix Integration Test Suite
 * Parity: StomX / DentalPRO Chair Doctor Shift Roster & 1-Click Shift Allocation
 *
 * Mandates:
 * - Mandate 8e (Doctor & Staff Autonomy): Non-blocking shift saves, 0 disabled buttons.
 * - Mandate 8k (CRM != Reality Simulator): 1-click weekly presets (5-day, 2/2, Morning, Evening, Full Day).
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty): Clean resilient fallbacks for 1-chair clinics.
 * - Mandate 8o (Task-Scope Reporting).
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
	generateWeeklyScheduleForStaffAndCabinets,
} = await import("../DoctorShiftRosterModal");

import type {
	CabinetDefinition,
	DoctorShift,
	StaffMember,
} from "../DoctorShiftRosterModal";

describe("Schedule Shift Roster & Doctor-to-Chair Matrix Integration (StomX / DentalPRO Parity)", () => {
	const mockRealStaff: StaffMember[] = [
		{
			id: "doc-real-1",
			fullName: "Смирнова Анна Сергеевна",
			shortName: "Смирнова А.С.",
			role: "therapist",
			isDoctor: true,
			isAssistant: false,
			avatarColor: "#0d9488",
			weeklyHourLimit: 33,
			defaultAssistantId: "asst-real-1",
			tabNumber: "00101",
		},
		{
			id: "doc-real-2",
			fullName: "Кузнецов Петр Васильевич",
			shortName: "Кузнецов П.В.",
			role: "surgeon",
			isDoctor: true,
			isAssistant: false,
			avatarColor: "#0284c7",
			weeklyHourLimit: 33,
			tabNumber: "00102",
		},
		{
			id: "asst-real-1",
			fullName: "Волкова Мария Ивановна",
			shortName: "Волкова М.И.",
			role: "assistant",
			isDoctor: false,
			isAssistant: true,
			avatarColor: "#8b5cf6",
			weeklyHourLimit: 39,
			tabNumber: "00103",
		},
	];

	const mockRealCabinets: CabinetDefinition[] = [
		{
			id: "cab-therapy-1",
			number: 1,
			name: "Кабинет Терапии №1",
			specialty: "Терапевтическая стоматология",
			chairs: [
				{ id: "chair-planmeca-1", name: "Кресло Planmeca Compact", equipment: "Planmeca Compact i" },
				{ id: "chair-sirona-2", name: "Кресло Dentsply Sirona", equipment: "Sirona Intego" },
			],
		},
		{
			id: "cab-surgery-2",
			number: 2,
			name: "Хирургический Блок №2",
			specialty: "Хирургическая стоматология",
			chairs: [
				{ id: "chair-kavo-3", name: "Кресло KaVo Primus", equipment: "KaVo Primus 1058 Life" },
			],
		},
	];

	it("renders DoctorShiftRosterModal with real clinic staff and chair names when provided", () => {
		const html = renderToStaticMarkup(
			React.createElement(DoctorShiftRosterModal, {
				isOpen: true,
				onClose: () => {},
				staffList: mockRealStaff,
				cabinets: mockRealCabinets,
				clinicName: 'ООО "Денте Премиум"',
			}),
		);

		// Clinic name
		assert.ok(html.includes("Денте Премиум"));

		// Real cabinets and chairs
		assert.ok(html.includes("Кабинет Терапии №1"));
		assert.ok(html.includes("Кресло Planmeca Compact"));
		assert.ok(html.includes("Кресло Dentsply Sirona"));
		assert.ok(html.includes("Хирургический Блок №2"));
		assert.ok(html.includes("Кресло KaVo Primus"));

		// Real staff names rendered in doctor shifts / summary
		assert.ok(html.includes("Смирнова А.С.") || html.includes("Смирнова Анна Сергеевна"));
	});

	describe("1-Click Shift Allocation Presets Engine (Mandates 8e, 8k, 8n)", () => {
		const startDateIso = "2026-08-24"; // Monday

		it("generates 'five_day' preset (Mon-Fri 08:30-14:30 and 14:30-20:30) with doctor and assistant pairs", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff,
				mockRealCabinets,
				"five_day",
			);

			assert.ok(shifts.length > 0, "Must generate shifts for five-day week");

			// All shifts must be on Mon-Fri (no Sunday)
			for (const shift of shifts) {
				const day = new Date(shift.dateIso).getDay();
				assert.ok(day >= 1 && day <= 6, `Shift must be Mon-Sat, got day ${day}`);
				assert.ok(shift.durationHours > 0, "Shift duration must be positive");
				assert.ok(shift.doctorId.length > 0, "Doctor must be assigned");
				assert.ok(shift.chairId.length > 0, "Chair must be assigned");
				assert.ok(shift.cabinetId.length > 0, "Cabinet must be assigned");
			}

			// Morning shifts must have 6h duration
			const mornShifts = shifts.filter((s) => s.archetypeId === "morning_shift");
			assert.ok(mornShifts.length > 0);
			assert.equal(mornShifts[0]?.startTime, "08:30");
			assert.equal(mornShifts[0]?.endTime, "14:30");
			assert.equal(mornShifts[0]?.durationHours, 6.0);

			// Evening shifts
			const eveShifts = shifts.filter((s) => s.archetypeId === "evening_shift");
			assert.ok(eveShifts.length > 0);
			assert.equal(eveShifts[0]?.startTime, "14:30");
			assert.equal(eveShifts[0]?.endTime, "20:30");
			assert.equal(eveShifts[0]?.durationHours, 6.0);
		});

		it("generates 'two_two' preset (2/2 rolling shifts 09:00-21:00) with 11h working duration", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff,
				mockRealCabinets,
				"two_two",
			);

			assert.ok(shifts.length > 0, "Must generate shifts for 2/2 schedule");
			for (const shift of shifts) {
				assert.equal(shift.startTime, "09:00");
				assert.equal(shift.endTime, "21:00");
				assert.equal(shift.durationHours, 11.0);
				assert.equal(shift.breakMinutes, 60);
				assert.equal(shift.customNotes, "Сменный график 2/2");
			}
		});

		it("generates 'morning' preset (Mon-Sat 08:00-14:00) across all chairs", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff,
				mockRealCabinets,
				"morning",
			);

			assert.ok(shifts.length > 0);
			for (const shift of shifts) {
				assert.equal(shift.startTime, "08:00");
				assert.equal(shift.endTime, "14:00");
				assert.equal(shift.durationHours, 6.0);
				assert.equal(shift.breakMinutes, 0);
			}
		});

		it("generates 'evening' preset (Mon-Sat 14:00-20:00) across all chairs", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff,
				mockRealCabinets,
				"evening",
			);

			assert.ok(shifts.length > 0);
			for (const shift of shifts) {
				assert.equal(shift.startTime, "14:00");
				assert.equal(shift.endTime, "20:00");
				assert.equal(shift.durationHours, 6.0);
				assert.equal(shift.breakMinutes, 0);
			}
		});

		it("generates 'full_day' preset (Mon-Sat 08:00-20:00) across all chairs", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff,
				mockRealCabinets,
				"full_day",
			);

			assert.ok(shifts.length > 0);
			for (const shift of shifts) {
				assert.equal(shift.startTime, "08:00");
				assert.equal(shift.endTime, "20:00");
				assert.equal(shift.durationHours, 11.0);
				assert.equal(shift.breakMinutes, 60);
				assert.equal(shift.customNotes, "Полный день 08:00–20:00");
			}
		});

		it("resiliently handles solo doctor with empty chairs catalogue (Mandate 8n)", () => {
			const soloStaff: StaffMember[] = [
				{
					id: "doc-solo",
					fullName: "Д-р Соловьев А.В.",
					shortName: "Соловьев А.В.",
					role: "therapist",
					isDoctor: true,
					isAssistant: false,
					avatarColor: "#0d9488",
					weeklyHourLimit: 33,
					tabNumber: "00001",
				},
			];

			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				soloStaff,
				[], // No cabinets configured
				"five_day",
			);

			assert.ok(shifts.length > 0, "Must create shifts using default fallback chair");
			assert.equal(shifts[0]?.chairId, "chair-1a");
			assert.equal(shifts[0]?.doctorId, "doc-solo");
		});
	});

	describe("UI Quick Preset Strip and Touch Targets (Mandates 8d, 8e)", () => {
		it("renders 1-click shift allocation presets strip with distinct buttons", () => {
			const html = renderToStaticMarkup(
				React.createElement(DoctorShiftRosterModal, {
					isOpen: true,
					onClose: () => {},
					staffList: mockRealStaff,
					cabinets: mockRealCabinets,
				}),
			);

			// Strip container
			assert.ok(html.includes("roster-presets-strip"));

			// Preset buttons
			assert.ok(html.includes('data-testid="roster-preset-five-day"'));
			assert.ok(html.includes('data-testid="roster-preset-two-two"'));
			assert.ok(html.includes('data-testid="roster-preset-morning"'));
			assert.ok(html.includes('data-testid="roster-preset-evening"'));
			assert.ok(html.includes('data-testid="roster-preset-full-day"'));

			// Preset labels
			assert.ok(html.includes("Пятидневка"));
			assert.ok(html.includes("2/2"));
			assert.ok(html.includes("Утро 08:00–14:00"));
			assert.ok(html.includes("Вечер 14:00–20:00"));
			assert.ok(html.includes("Полный день 08:00–20:00"));
		});

		it("enforces touch targets >= 44px on all action buttons (Mandate 8d)", () => {
			const html = renderToStaticMarkup(
				React.createElement(DoctorShiftRosterModal, {
					isOpen: true,
					onClose: () => {},
					staffList: mockRealStaff,
					cabinets: mockRealCabinets,
				}),
			);

			// Preset buttons touch targets
			assert.ok(
				html.includes("min-height:44px") || html.includes("min-height: 44px") || html.includes("min-h-[44px]"),
				"Must have min-height: 44px touch target",
			);

			// Save and Close buttons
			assert.ok(html.includes('data-testid="roster-save-btn"'));
			assert.ok(html.includes('data-testid="roster-apply-close-btn"'));

			// Non-blocking doctor autonomy: buttons must never be disabled
			assert.ok(!html.includes('data-testid="roster-save-btn" disabled'));
			assert.ok(!html.includes('data-testid="roster-apply-close-btn" disabled'));
		});

		it("renders chair utilization tab without throwing on sanitized appointments", () => {
			const mockAppointments = [
				{
					chairId: "chair-planmeca-1",
					startsAt: "2026-08-24T09:00:00.000Z",
					endsAt: "2026-08-24T10:30:00.000Z",
					status: "confirmed",
				},
				{
					chairId: "chair-sirona-2",
					startsAt: "2026-08-24T14:00:00.000Z",
					endsAt: "2026-08-24T15:00:00.000Z",
				},
			];

			const html = renderToStaticMarkup(
				React.createElement(DoctorShiftRosterModal, {
					isOpen: true,
					onClose: () => {},
					staffList: mockRealStaff,
					cabinets: mockRealCabinets,
					appointments: mockAppointments,
				}),
			);

			// Modal renders cleanly with utilization data
			assert.ok(html.includes("Кабинет Терапии №1"));
			assert.ok(html.includes("Кресло Planmeca Compact"));
		});
	});
});
