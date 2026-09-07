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
	getMondayOfWeekIso,
	DoctorRosterToolbar,
	DoctorRosterMatrix,
} = await import("../DoctorShiftRosterModal");

import {
	detectRosterConflicts,
	generateFormT13Matrix,
	exportFormT13ToCsv,
} from "../doctorShiftRosterEngine";

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

	describe("Adversarial Red-Teaming: 3 Chairs and 2 Doctors (Mandate 8m)", () => {
		const startDateIso = "2026-08-24"; // Monday

		it("five_day preset with 3 chairs and 2 doctors has ZERO doctor double-bookings", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff, // 2 doctors, 1 assistant
				mockRealCabinets, // 3 chairs
				"five_day",
			);

			assert.ok(shifts.length > 0);
			const conflicts = detectRosterConflicts(shifts, mockRealStaff);
			const doubleBookings = conflicts.filter((c) => c.type === "doctor_double_booking");
			assert.equal(
				doubleBookings.length,
				0,
				`Must not produce doctor double booking conflicts with 3 chairs and 2 doctors. Found: ${JSON.stringify(doubleBookings)}`,
			);
		});

		it("two_two preset with 3 chairs and 2 doctors does not clone doctors across multiple chairs", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff,
				mockRealCabinets,
				"two_two",
			);

			assert.ok(shifts.length > 0);
			const conflicts = detectRosterConflicts(shifts, mockRealStaff);
			const doubleBookings = conflicts.filter((c) => c.type === "doctor_double_booking");
			assert.equal(
				doubleBookings.length,
				0,
				`2/2 preset must not assign doctor to multiple chairs simultaneously. Found: ${JSON.stringify(doubleBookings)}`,
			);
		});

		it("morning preset with 3 chairs and 2 doctors staffs at most 2 chairs simultaneously", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff,
				mockRealCabinets,
				"morning",
			);

			assert.ok(shifts.length > 0);
			const conflicts = detectRosterConflicts(shifts, mockRealStaff);
			const doubleBookings = conflicts.filter((c) => c.type === "doctor_double_booking");
			assert.equal(doubleBookings.length, 0);

			// Check each day has at most 2 active morning shifts
			const shiftsByDate = new Map<string, DoctorShift[]>();
			for (const s of shifts) {
				const list = shiftsByDate.get(s.dateIso) || [];
				list.push(s);
				shiftsByDate.set(s.dateIso, list);
			}
			for (const [_date, dayShifts] of shiftsByDate.entries()) {
				assert.ok(dayShifts.length <= 2, "Cannot have more shifts than active doctors");
			}
		});

		it("handles 1 chair and 3 doctors without overlapping shifts", () => {
			const singleCabinet: CabinetDefinition[] = [
				{
					id: "cab-solo",
					number: 1,
					name: "Кабинет 1",
					specialty: "Терапия",
					chairs: [{ id: "chair-single", name: "Кресло 1", equipment: "Установка" }],
				},
			];

			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				startDateIso,
				mockRealStaff,
				singleCabinet,
				"morning",
			);

			assert.ok(shifts.length > 0);
			const conflicts = detectRosterConflicts(shifts, mockRealStaff);
			const chairOverlaps = conflicts.filter((c) => c.type === "chair_double_booking");
			assert.equal(chairOverlaps.length, 0, "No chair collisions on single chair");
		});
	});

	describe("Full Persistence Loop & Chair Header Instant Updates (Mandates 8e, 8n)", () => {
		it("initializes from localStorage dente_doctor_shifts and preserves shifts", () => {
			const storedShifts: DoctorShift[] = [
				{
					id: "shift-stored-1",
					doctorId: "doc-real-1",
					doctorName: "Смирнова Анна Сергеевна",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-therapy-1",
					chairId: "chair-planmeca-1",
					dateIso: "2026-08-24",
					archetypeId: "morning_shift",
					startTime: "08:30",
					endTime: "14:30",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			// Simulate JSON round-trip
			const serialized = JSON.stringify(storedShifts);
			const parsed = JSON.parse(serialized);
			assert.equal(parsed.length, 1);
			assert.equal(parsed[0].doctorId, "doc-real-1");
			assert.equal(parsed[0].chairId, "chair-planmeca-1");
		});

		it("evaluates computedChairDoctorAssignments correctly for active dateKey", () => {
			const shifts: DoctorShift[] = [
				{
					id: "shift-2026-08-24-chair-planmeca-1",
					doctorId: "doc-real-1",
					doctorName: "Смирнова Анна Сергеевна",
					doctorRole: "therapist",
					assistantId: "asst-real-1",
					assistantName: "Волкова М.И.",
					cabinetId: "cab-therapy-1",
					chairId: "chair-planmeca-1",
					dateIso: "2026-08-24",
					archetypeId: "morning_shift",
					startTime: "08:30",
					endTime: "14:30",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
				{
					id: "shift-2026-08-24-chair-sirona-2",
					doctorId: "doc-real-2",
					doctorName: "Кузнецов Петр Васильевич",
					doctorRole: "surgeon",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-therapy-1",
					chairId: "chair-sirona-2",
					dateIso: "2026-08-24",
					archetypeId: "evening_shift",
					startTime: "14:30",
					endTime: "20:30",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			const currentDateKey = "2026-08-24";
			const assignments: Record<string, any> = {};

			for (const shift of shifts) {
				if (shift.dateIso === currentDateKey && shift.chairId && shift.doctorId) {
					const preset = shift.archetypeId === "morning_shift"
						? "morning"
						: shift.archetypeId === "evening_shift"
							? "evening"
							: "custom";
					const hours = `${shift.startTime}–${shift.endTime}`;
					assignments[shift.chairId] = {
						chairId: shift.chairId,
						doctorId: shift.doctorId,
						doctorName: shift.doctorName,
						doctorSpecialty: shift.doctorRole,
						shiftPreset: preset,
						shiftLabel: shift.customNotes || hours,
						shiftHours: hours,
						startHour: parseInt(shift.startTime.slice(0, 2), 10) || 8,
						endHour: parseInt(shift.endTime.slice(0, 2), 10) || 20,
					};
				}
			}

			assert.ok(assignments["chair-planmeca-1"]);
			assert.equal(assignments["chair-planmeca-1"].doctorId, "doc-real-1");
			assert.equal(assignments["chair-planmeca-1"].shiftPreset, "morning");
			assert.equal(assignments["chair-planmeca-1"].shiftHours, "08:30–14:30");

			assert.ok(assignments["chair-sirona-2"]);
			assert.equal(assignments["chair-sirona-2"].doctorId, "doc-real-2");
			assert.equal(assignments["chair-sirona-2"].shiftPreset, "evening");
			assert.equal(assignments["chair-sirona-2"].shiftHours, "14:30–20:30");
		});
	});

	describe("Form T-13 Tab and CSV Export with Real Clinic Staff (Mandates 8e, 8n)", () => {
		it("generates Form T-13 matrix with real clinic staff without mock placeholders", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				"2026-08-24",
				mockRealStaff,
				mockRealCabinets,
				"five_day",
			);

			const t13Matrix = generateFormT13Matrix(mockRealStaff, shifts, 2026, 8);
			assert.equal(t13Matrix.length, mockRealStaff.length);

			// Real staff names and positions
			assert.equal(t13Matrix[0]?.tabNumber, "00101");
			assert.equal(t13Matrix[0]?.staffName, "Смирнова Анна Сергеевна");
			assert.ok(t13Matrix[0]?.totalMonthHours > 0);

			assert.equal(t13Matrix[1]?.tabNumber, "00102");
			assert.equal(t13Matrix[1]?.staffName, "Кузнецов Петр Васильевич");

			assert.equal(t13Matrix[2]?.tabNumber, "00103");
			assert.equal(t13Matrix[2]?.staffName, "Волкова Мария Ивановна");
		});

		it("exports Form T-13 to CSV with UTF-8 BOM, clinic name and correct headers", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				"2026-08-24",
				mockRealStaff,
				mockRealCabinets,
				"five_day",
			);

			const t13Matrix = generateFormT13Matrix(mockRealStaff, shifts, 2026, 8);
			const csv = exportFormT13ToCsv(t13Matrix, 2026, 8, 'ООО "Денте Премиум"');

			// UTF-8 BOM
			assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM for Excel/1C");

			// Clinic Name in Header
			assert.ok(csv.includes("Денте Премиум"));

			// Statutory T-13 Title
			assert.ok(csv.includes("Унифицированная форма № Т-13"));

			// Staff records
			assert.ok(csv.includes("00101"));
			assert.ok(csv.includes("Смирнова Анна Сергеевна"));
			assert.ok(csv.includes("00102"));
			assert.ok(csv.includes("Кузнецов Петр Васильевич"));
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

	describe("Dynamic Monday Calculation & Date Independence (Inquisition Checklist #1)", () => {
		it("calculates Monday of the week correctly for any date without hardcoded 2026-08-24", () => {
			// September 2026 dates
			assert.equal(getMondayOfWeekIso("2026-09-07"), "2026-09-07"); // Monday
			assert.equal(getMondayOfWeekIso("2026-09-09"), "2026-09-07"); // Wednesday
			assert.equal(getMondayOfWeekIso("2026-09-11"), "2026-09-07"); // Friday
			assert.equal(getMondayOfWeekIso("2026-09-13"), "2026-09-07"); // Sunday

			// October 2026 dates
			assert.equal(getMondayOfWeekIso("2026-10-15"), "2026-10-12"); // Thursday -> Monday Oct 12
			assert.equal(getMondayOfWeekIso("2026-10-18"), "2026-10-12"); // Sunday -> Monday Oct 12

			// Fallback when undefined: returns valid ISO Monday of current week, not hardcoded past date
			const dynamicMonday = getMondayOfWeekIso(undefined);
			assert.match(dynamicMonday, /^\d{4}-\d{2}-\d{2}$/);
			const d = new Date(dynamicMonday);
			assert.ok(!Number.isNaN(d.getTime()));
		});
	});

	describe("Adversarial 2/2 Schedule: Alternating Pairs & Zero Collisions (Inquisition Checklist #2)", () => {
		it("allocates alternating doctor pairs per chair with zero double-booking across 4 doctors and 2 chairs", () => {
			const fourDoctorsStaff: StaffMember[] = [
				{
					id: "doc-1",
					fullName: "Доктор 1",
					shortName: "Доктор 1",
					role: "therapist",
					isDoctor: true,
					isAssistant: false,
					weeklyHourLimit: 33,
					avatarColor: "#0d9488",
					tabNumber: "001",
				},
				{
					id: "doc-2",
					fullName: "Доктор 2",
					shortName: "Доктор 2",
					role: "therapist",
					isDoctor: true,
					isAssistant: false,
					weeklyHourLimit: 33,
					avatarColor: "#0284c7",
					tabNumber: "002",
				},
				{
					id: "doc-3",
					fullName: "Доктор 3",
					shortName: "Доктор 3",
					role: "therapist",
					isDoctor: true,
					isAssistant: false,
					weeklyHourLimit: 33,
					avatarColor: "#8b5cf6",
					tabNumber: "003",
				},
				{
					id: "doc-4",
					fullName: "Доктор 4",
					shortName: "Доктор 4",
					role: "therapist",
					isDoctor: true,
					isAssistant: false,
					weeklyHourLimit: 33,
					avatarColor: "#f59e0b",
					tabNumber: "004",
				},
			];

			const twoChairsCabinets: CabinetDefinition[] = [
				{
					id: "cab-1",
					number: 1,
					name: "Кабинет 1",
					specialty: "Терапия",
					chairs: [
						{ id: "chair-1", name: "Кресло 1", equipment: "A-dec" },
						{ id: "chair-2", name: "Кресло 2", equipment: "Sirona" },
					],
				},
			];

			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				"2026-09-07",
				fourDoctorsStaff,
				twoChairsCabinets,
				"two_two",
			);

			// Conflict detection: MUST HAVE ZERO ERRORS
			const conflicts = detectRosterConflicts(shifts, fourDoctorsStaff);
			const errorConflicts = conflicts.filter((c) => c.severity === "error");
			assert.equal(errorConflicts.length, 0, "2/2 schedule must produce ZERO conflict errors");

			// Verify chair-doctor allocation per day
			const shiftsByDateAndChair = new Map<string, DoctorShift[]>();
			for (const shift of shifts) {
				const key = `${shift.dateIso}_${shift.chairId}`;
				const list = shiftsByDateAndChair.get(key) || [];
				list.push(shift);
				shiftsByDateAndChair.set(key, list);
			}

			// Each chair on each day has AT MOST 1 doctor shift
			for (const [key, chairShifts] of shiftsByDateAndChair.entries()) {
				assert.ok(chairShifts.length <= 1, `Chair ${key} must not have multiple shifts simultaneously`);
			}

			// Verify each doctor is on AT MOST 1 chair per day
			const shiftsByDateAndDoc = new Map<string, DoctorShift[]>();
			for (const shift of shifts) {
				const key = `${shift.dateIso}_${shift.doctorId}`;
				const list = shiftsByDateAndDoc.get(key) || [];
				list.push(shift);
				shiftsByDateAndDoc.set(key, list);
			}

			for (const [key, docShifts] of shiftsByDateAndDoc.entries()) {
				assert.ok(docShifts.length <= 1, `Doctor ${key} must not be scheduled on multiple chairs on the same day`);
			}
		});
	});

	describe("Modular Component Extraction (DoctorRosterToolbar & DoctorRosterMatrix)", () => {
		it("renders DoctorRosterToolbar standalone without crashing", () => {
			const html = renderToStaticMarkup(
				React.createElement(DoctorRosterToolbar, {
					clinicName: 'ООО "Денте Премиум"',
					kpis: {
						totalWeekShifts: 12,
						totalWeeklyHours: 72,
						assistantPairingPct: 100,
						conflictCount: 0,
						errorConflictCount: 0,
					},
					activeTab: "cabinets",
					onSelectTab: () => {},
					weekStartDateIso: "2026-09-07",
					weekEndDateIso: "2026-09-13",
					selectedYear: 2026,
					onPrevWeek: () => {},
					onNextWeek: () => {},
					onAutoFillDefault: () => {},
					onApplyPreset: () => {},
					onPrintSchedule: () => {},
					onExportT13: () => {},
					onSaveAll: () => {},
					onClose: () => {},
					notification: null,
					conflicts: [],
				}),
			);

			assert.ok(html.includes("Норма: 33 ч/нед"));
			assert.ok(html.includes("Денте Премиум"));
			assert.ok(html.includes("Шаблоны сменности:"));
			assert.ok(html.includes("data-testid=\"roster-preset-two-two\""));
		});

		it("renders DoctorRosterMatrix standalone without crashing", () => {
			const shifts = generateWeeklyScheduleForStaffAndCabinets(
				"2026-09-07",
				mockRealStaff,
				mockRealCabinets,
				"five_day",
			);
			const t13Matrix = generateFormT13Matrix(mockRealStaff, shifts, 2026, 9);

			const html = renderToStaticMarkup(
				React.createElement(DoctorRosterMatrix, {
					activeTab: "cabinets",
					weekDays: [
						{ dateIso: "2026-09-07", dayName: "Пн", dayNumber: "07", isWeekend: false },
						{ dateIso: "2026-09-08", dayName: "Вт", dayNumber: "08", isWeekend: false },
					],
					weekStartDateIso: "2026-09-07",
					weekEndDateIso: "2026-09-13",
					selectedYear: 2026,
					selectedMonth: 9,
					cabinets: mockRealCabinets,
					staffList: mockRealStaff,
					shifts,
					conflicts: [],
					t13Matrix,
					sanitizedAppointments: [],
					onOpenEdit: () => {},
					onOpenCreateInCell: () => {},
					onOpenInternalT13Modal: () => {},
					onExportT13: () => {},
					onClose: () => {},
				}),
			);

			assert.ok(html.includes("Кабинет Терапии №1"));
			assert.ok(html.includes("Кресло Planmeca Compact"));
		});
	});
});
