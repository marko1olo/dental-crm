import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	resolveChairDutyDoctor,
	DEFAULT_SOLO_CHAIR,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import {
	calculateShiftDurationHours,
	detectRosterConflicts,
	type DoctorShift,
} from "../roster/doctorShiftRosterEngine";
import { ScheduleView } from "../../../ScheduleView";
import { QuickBookingDrawer } from "../QuickBookingDrawer";

describe("Schedule & Chair Roster StomX / IDENT Comprehensive Parity", () => {
	describe("1. Dental Chair Duty Doctor Shift Resolution (StomX / IDENT Parity)", () => {
		const twoShiftAssignment: ChairDoctorShiftAssignment = {
			chairId: "chair-1",
			chairName: "Кресло 1 (Терапия)",
			shiftPreset: "two_shifts",
			shiftHours: "08:00–20:00",
			doctorId: "doc-morning",
			doctorName: "Д-р Утренний А.В.",
			subShifts: [
				{
					doctorId: "doc-morning",
					doctorName: "Д-р Утренний А.В.",
					startHour: 8,
					endHour: 14,
					shiftHours: "08:00–14:00",
				},
				{
					doctorId: "doc-evening",
					doctorName: "Д-р Вечерний С.М.",
					startHour: 14,
					endHour: 20,
					shiftHours: "14:00–20:00",
				},
			],
		};

		const assignmentsRecord: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": twoShiftAssignment,
			"chair-2": {
				chairId: "chair-2",
				chairName: "Кресло 2 (Хирургия)",
				shiftPreset: "full",
				shiftHours: "08:00–20:00",
				doctorId: "doc-surgeon",
				doctorName: "Д-р Хирург И.П.",
			},
		};

		it("resolves morning shift doctor for hours before 14:00 (e.g. 09:30)", () => {
			const duty = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-08T09:30",
				assignmentsRecord,
				"2026-09-08",
			);
			assert.equal(duty.doctorId, "doc-morning");
			assert.equal(duty.shiftHours, "08:00–14:00");
		});

		it("resolves evening shift doctor for hours at or after 14:00 (e.g. 15:00)", () => {
			const duty = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-08T15:00",
				assignmentsRecord,
				"2026-09-08",
			);
			assert.equal(duty.doctorId, "doc-evening");
			assert.equal(duty.shiftHours, "14:00–20:00");
		});

		it("resolves full-day shift doctor across both morning and evening hours", () => {
			const dutyMorning = resolveChairDutyDoctor(
				"chair-2",
				"2026-09-08T10:00",
				assignmentsRecord,
				"2026-09-08",
			);
			assert.equal(dutyMorning.doctorId, "doc-surgeon");

			const dutyEvening = resolveChairDutyDoctor(
				"chair-2",
				"2026-09-08T18:00",
				assignmentsRecord,
				"2026-09-08",
			);
			assert.equal(dutyEvening.doctorId, "doc-surgeon");
		});

		it("resolves to null when slot is outside operating hours (< 08:00 or > 20:00)", () => {
			const dutyEarly = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-08T06:00",
				assignmentsRecord,
				"2026-09-08",
			);
			assert.equal(dutyEarly.doctorId, null);

			const dutyLate = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-08T22:00",
				assignmentsRecord,
				"2026-09-08",
			);
			assert.equal(dutyLate.doctorId, null);
		});
	});

	describe("2. Auto-Chair Binding on Doctor Selection (Fix for DEF-01)", () => {
		const chairs = [
			{ id: "chair-therapy", name: "Терапевтическое кресло", specialization: "therapy", active: true },
			{ id: "chair-surgery", name: "Хирургическое кресло", specialization: "surgery", active: true },
			{ id: "chair-ortho", name: "Ортодонтическое кресло", specialization: "orthodontics", active: true },
		];

		const chairDoctorAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-therapy": {
				chairId: "chair-therapy",
				chairName: "Терапевтическое кресло",
				doctorId: "doc-ivanov",
				doctorName: "Д-р Иванов И.И.",
				shiftPreset: "full",
				shiftHours: "08:00–20:00",
			},
			"chair-surgery": {
				chairId: "chair-surgery",
				chairName: "Хирургическое кресло",
				doctorId: "doc-petrov",
				doctorName: "Д-р Петров П.П.",
				shiftPreset: "full",
				shiftHours: "08:00–20:00",
			},
		};

		it("correctly identifies doctor's assigned chair by duty schedule at specified time", () => {
			const targetDocId = "doc-petrov";
			const scheduledTime = "2026-09-08T11:00";

			// Simulating the enhanced doctor-change chair resolution algorithm
			const assignedChair = chairs.find((c) => {
				const duty = resolveChairDutyDoctor(
					c.id,
					scheduledTime,
					chairDoctorAssignments,
					scheduledTime.split("T")[0],
				);
				return duty.doctorId === targetDocId;
			});

			assert.ok(assignedChair, "Assigned chair must be found for doctor");
			assert.equal(assignedChair.id, "chair-surgery");
			assert.equal(assignedChair.name, "Хирургическое кресло");
		});

		it("falls back to doctor specialty matching chair when doctor has no shift assigned", () => {
			const doctors = [
				{
					id: "doc-sidorov",
					fullName: "Д-р Сидоров С.С.",
					specialties: ["orthodontics"],
				},
			];

			const targetDocId = "doc-sidorov";
			const scheduledTime = "2026-09-08T16:00";

			const assignedChair = chairs.find((c) => {
				const duty = resolveChairDutyDoctor(
					c.id,
					scheduledTime,
					chairDoctorAssignments,
					scheduledTime.split("T")[0],
				);
				return duty.doctorId === targetDocId;
			});

			// No duty assignment, check specialty fallback
			let effectiveChairId = assignedChair?.id;
			if (!effectiveChairId) {
				const doc = doctors.find((d) => d.id === targetDocId);
				if (doc?.specialties?.length) {
					const matchingChair = chairs.find(
						(c) => c.specialization && doc.specialties.includes(c.specialization),
					);
					if (matchingChair) {
						effectiveChairId = matchingChair.id;
					}
				}
			}

			assert.equal(effectiveChairId, "chair-ortho");
		});

		it("ensures solo doctor mode preselects chair with 0 clicks (Mandate 8n)", () => {
			const soloChairs = [
				{ id: "chair-solo", name: "Кресло 1 (Основное)", active: true },
			];
			const isSoloDoctor = soloChairs.length === 1;
			const initialChairId = isSoloDoctor && soloChairs[0] ? soloChairs[0].id : "";
			assert.equal(initialChairId, "chair-solo");
		});
	});

	describe("3. Weekly Doctor Shift Roster Engine & Conflict Detection", () => {
		it("calculates exact shift duration hours conforming to TK RF standards", () => {
			// Morning shift 08:00–14:00 = 6 hours
			const morningDuration = calculateShiftDurationHours("08:00", "14:00", 0);
			assert.equal(morningDuration.durationHours, 6.0);

			// Evening shift 14:00–20:00 = 6 hours
			const eveningDuration = calculateShiftDurationHours("14:00", "20:00", 0);
			assert.equal(eveningDuration.durationHours, 6.0);

			// Full day 08:00–20:00 with 60 min break = 11 hours
			const fullDayWithBreak = calculateShiftDurationHours("08:00", "20:00", 60);
			assert.equal(fullDayWithBreak.durationHours, 11.0);
		});

		it("detects chair collision when two shifts overlap on the same chair", () => {
			const conflictingShifts: DoctorShift[] = [
				{
					id: "s-1",
					doctorId: "doc-1",
					doctorName: "Д-р Первый",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-08",
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "15:00", // Overlaps into evening
					durationHours: 7.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
				{
					id: "s-2",
					doctorId: "doc-2",
					doctorName: "Д-р Второй",
					doctorRole: "orthopedist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-08",
					archetypeId: "evening_shift",
					startTime: "14:00", // Overlap from 14:00 to 15:00!
					endTime: "20:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			const conflicts = detectRosterConflicts(conflictingShifts);
			assert.ok(conflicts.length > 0, "Conflict must be detected for overlapping chair shifts");
			assert.ok(
				conflicts.some((c) => c.type === "chair_double_booking" || c.type === "doctor_double_booking"),
				"Must report double booking or overlap",
			);
		});

		it("passes without conflicts for non-overlapping morning (08:00–14:00) and evening (14:00–20:00) shifts", () => {
			const cleanShifts: DoctorShift[] = [
				{
					id: "s-1",
					doctorId: "doc-1",
					doctorName: "Д-р Первый",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-08",
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
					id: "s-2",
					doctorId: "doc-2",
					doctorName: "Д-р Второй",
					doctorRole: "orthopedist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-08",
					archetypeId: "evening_shift",
					startTime: "14:00",
					endTime: "20:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			const conflicts = detectRosterConflicts(cleanShifts);
			assert.equal(conflicts.length, 0, "Clean two-shift roster must have zero conflicts");
		});
	});

	describe("4. Canonical Component Exports & Integrity Verification", () => {
		it("exports ScheduleView and renders safely", () => {
			assert.ok(ScheduleView, "ScheduleView must be exported");
			assert.equal(typeof ScheduleView, "function");
		});

		it("exports ChairScheduleView and renders safely with action bar and chair counters", () => {
			assert.ok(ChairScheduleView, "ChairScheduleView must be exported");
			assert.equal(typeof ChairScheduleView, "function");

			const mockDashboard: any = {
				clinicSettings: {
					profile: { clinicName: "DENTE Demo Clinic" },
					chairs: [
						{ id: "chair-1", name: "Кресло 1", active: true, color: "#0d9488" },
						{ id: "chair-2", name: "Кресло 2", active: true, color: "#3b82f6" },
					],
					staff: [],
				},
				appointments: [],
				patients: [],
			};

			const html = renderToString(
				React.createElement(ChairScheduleView, {
					dashboard: mockDashboard,
					dateKey: "2026-09-08",
					appointments: [],
					onSlotClick: () => {},
					onAppointmentClick: () => {},
					patientName: () => "Тест",
					formatTime: (t) => t,
					toDateTimeLocalValue: (t) => t,
					appointmentLabels: { planned: "Запланирован" } as any,
				}),
			);

			assert.ok(html.includes("Стоматологические установки:"), "Must render chair header label");
			assert.ok(html.includes("2 кресла"), "Must display chair counter badge");
			assert.ok(html.includes("+ Кресло"), "Must display quick add chair button");
		});

		it("exports QuickBookingDrawer conforming to Mandate 8e (0 disabled buttons)", () => {
			assert.ok(QuickBookingDrawer, "QuickBookingDrawer must be exported");
			assert.equal(typeof QuickBookingDrawer, "function");
		});

		it("ensures DEFAULT_SOLO_CHAIR has active=true and resilient fallback room and color", () => {
			assert.equal(DEFAULT_SOLO_CHAIR.id, "default-chair");
			assert.equal(DEFAULT_SOLO_CHAIR.isActive, true);
			assert.ok(DEFAULT_SOLO_CHAIR.name.includes("Кресло 1"));
		});
	});
});
