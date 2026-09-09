/**
 * Wave 60 Test Suite: Chair Management, Shift Rostering and Duty Doctor Auto-Assignment
 * Parity with StomX and DentalPRO, enforcing Mandates 8d, 8e, 8k, 8n.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";
import { resolveChairDutyDoctor, QuickBookingDrawer } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";
import { DEFAULT_SOLO_CHAIR, type ChairDoctorShiftAssignment } from "../ScheduleGrid";

// Setup storage mock for Node environment
const storage: Record<string, string> = {};
const mockLocalStorage = {
	getItem: (key: string) => storage[key] ?? null,
	setItem: (key: string, val: string) => {
		storage[key] = String(val);
	},
	removeItem: (key: string) => {
		delete storage[key];
	},
	clear: () => {
		for (const k of Object.keys(storage)) delete storage[k];
	},
};
(globalThis as any).localStorage = mockLocalStorage;
if (typeof (globalThis as any).window === "undefined") {
	(globalThis as any).window = { localStorage: mockLocalStorage };
} else {
	(globalThis as any).window.localStorage = mockLocalStorage;
}

function expect(actual: any) {
	return {
		toBe: (expected: any) => {
			assert.strictEqual(actual, expected);
		},
		toEqual: (expected: any) => {
			assert.deepStrictEqual(actual, expected);
		},
		toBeNull: () => {
			assert.strictEqual(actual, null);
		},
		toBeTruthy: () => {
			assert.ok(Boolean(actual));
		},
		toBeFalsy: () => {
			assert.ok(!actual);
		},
		toContain: (expected: string) => {
			assert.ok(
				typeof actual === "string" && actual.includes(expected),
				`Expected string to contain "${expected}", but got: "${actual}"`,
			);
		},
		toBeGreaterThanOrEqual: (expected: number) => {
			assert.ok(actual >= expected, `Expected ${actual} >= ${expected}`);
		},
	};
}

const mockAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
	in_treatment: "На приеме",
	arrived: "Прибыл",
};

const mockDoctors = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		role: "doctor" as const,
		active: true,
		specialties: ["therapy"],
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Петрович",
		role: "doctor" as const,
		active: true,
		specialties: ["surgery"],
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кабинет 1 (Терапия)",
		active: true,
		specialization: "therapy",
		defaultDoctorId: "doc-1",
	},
	{
		id: "chair-2",
		name: "Кабинет 2 (Хирургия)",
		active: true,
		specialization: "surgery",
		defaultDoctorId: "doc-2",
	},
];

const mockDashboard = {
	appointments: [],
	todayAppointments: [],
	invoices: [],
	patients: [],
	activeVisit: null,
	stats: {
		todayRevenue: 0,
		monthlyRevenue: 0,
		activePatients: 0,
		todayAppointmentsCount: 0,
	},
	clinicSettings: {
		chairs: mockChairs as any,
		staff: mockDoctors as any,
		profile: {
			mode: "multi_chair",
			activeChairsCount: 2,
		} as any,
	},
} as unknown as Dashboard;

describe("Wave 60: Chair Management, Doctor Duty Binding and Shift Resolution", () => {
	beforeEach(() => {
		mockLocalStorage.clear();
	});

	describe("1. resolveChairDutyDoctor Fallback and Shift Boundaries", () => {
		it("1.1. Resolves defaultDoctorIdFallback when no date assignments exist", () => {
			const res = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-10T10:00:00",
				undefined,
				"2026-09-10",
				null,
				"doc-1",
			);
			expect(res.doctorId).toBe("doc-1");
			expect(res.shiftHours).toBe("08:00–20:00");
		});

		it("1.2. Resolves chair default doctor from localStorage if no explicit date shift exists", () => {
			mockLocalStorage.setItem(
				"dente_chair_default_doctors",
				JSON.stringify({ "chair-2": "doc-2" }),
			);

			const res = resolveChairDutyDoctor(
				"chair-2",
				"2026-09-10T15:00:00",
				undefined,
				"2026-09-10",
			);
			expect(res.doctorId).toBe("doc-2");
			expect(res.shiftHours).toBe("08:00–20:00");
		});

		it("1.3. Explicit shift takes precedence over default doctor fallback", () => {
			const assignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-2",
					doctorName: "Петров Петр Петрович",
					shiftPreset: "morning",
					shiftLabel: "08:00–14:00",
					shiftHours: "08:00–14:00",
					startHour: 8,
					endHour: 14,
				},
			};

			const morningRes = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-10T10:00:00",
				assignments,
				"2026-09-10",
				null,
				"doc-1",
			);
			expect(morningRes.doctorId).toBe("doc-2");
			expect(morningRes.shiftHours).toBe("08:00–14:00");

			const eveningRes = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-10T16:00:00",
				assignments,
				"2026-09-10",
				null,
				"doc-1",
			);
			expect(eveningRes.doctorId).toBeNull();
		});

		it("1.4. Distinguishes two-shift chair morning (< 14:00) and evening (>= 14:00)", () => {
			const assignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Иванов / Петров",
					shiftPreset: "two_shifts",
					shiftLabel: "Две смены",
					shiftHours: "08:00–14:00 & 14:00–20:00",
					startHour: 8,
					endHour: 20,
					subShifts: [
						{
							doctorId: "doc-1",
							doctorName: "Иванов Иван Иванович",
							startHour: 8,
							endHour: 14,
							shiftHours: "08:00–14:00",
						},
						{
							doctorId: "doc-2",
							doctorName: "Петров Петр Петрович",
							startHour: 14,
							endHour: 20,
							shiftHours: "14:00–20:00",
						},
					],
				},
			};

			const morningRes = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-10T11:00:00",
				assignments,
			);
			expect(morningRes.doctorId).toBe("doc-1");
			expect(morningRes.shiftHours).toBe("08:00–14:00");

			const eveningRes = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-10T17:00:00",
				assignments,
			);
			expect(eveningRes.doctorId).toBe("doc-2");
			expect(eveningRes.shiftHours).toBe("14:00–20:00");
		});
	});

	describe("2. QuickBookingDrawer: Default Doctor Pre-selection and Switching", () => {
		it("2.1. Automatically resolves chair defaultDoctorId when slot has only chairId", () => {
			const html = renderToString(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: mockDashboard,
					initialSlot: {
						chairId: "chair-2",
						dateKey: "2026-09-10",
						startTime: "11:00",
						startsAt: "2026-09-10T11:00:00",
					},
					chairDoctorAssignments: {},
				}),
			);

			expect(html).toContain("Петров");
			expect(html).toContain("duty-doctor-badge");
		});

		it("2.2. Switching chair dropdown is not disabled and renders all chairs (Mandate 8e)", () => {
			const html = renderToString(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: mockDashboard,
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-10",
						startTime: "10:00",
					},
					chairDoctorAssignments: {},
				}),
			);

			expect(html).toContain('data-testid="select-booking-chair"');
			expect(html).toContain("Кабинет 1 (Терапия)");
			expect(html).toContain("Кабинет 2 (Хирургия)");
			assert.ok(!html.includes('data-testid="select-booking-chair" disabled'));
		});
	});

	describe("3. AppointmentModal: Duty Doctor Resolution and Autonomy", () => {
		it("3.1. Auto-populates chair default doctor and displays duty badge", () => {
			const html = renderToString(
				React.createElement(AppointmentModal, {
					isOpen: true,
					onClose: () => {},
					onSave: async () => true,
					dashboard: mockDashboard,
					appointmentLabels: mockAppointmentLabels,
					activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
					patientName: (_p: any, id: string | null) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso?.slice(0, 16) || "",
					fromDateTimeLocalValue: (val: string) => (val ? `${val}:00.000Z` : ""),
					appointment: {
						chairId: "chair-2",
						startsAt: "2026-09-10T14:00:00.000Z",
						endsAt: "2026-09-10T14:30:00.000Z",
						status: "planned",
					} as unknown as Appointment,
					chairDoctorAssignments: {},
				}),
			);

			expect(html).toContain("duty-doctor-badge");
			expect(html).toContain("Кабинет 2 (Хирургия)");
		});

		it("3.2. Displays non-blocking override note when chosen doctor differs from duty doctor", () => {
			const html = renderToString(
				React.createElement(AppointmentModal, {
					isOpen: true,
					onClose: () => {},
					onSave: async () => true,
					dashboard: mockDashboard,
					appointmentLabels: mockAppointmentLabels,
					activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
					patientName: (_p: any, id: string | null) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso?.slice(0, 16) || "",
					fromDateTimeLocalValue: (val: string) => (val ? `${val}:00.000Z` : ""),
					appointment: {
						chairId: "chair-1",
						doctorUserId: "doc-2",
						startsAt: "2026-09-10T10:00:00.000Z",
						endsAt: "2026-09-10T10:30:00.000Z",
						status: "planned",
					} as unknown as Appointment,
					chairDoctorAssignments: {},
				}),
			);

			expect(html).toContain("duty-doctor-override-note");
			expect(html).toContain("Мандат 8e: запись не блокируется");
			assert.ok(!html.includes('data-testid="btn-save-appointment" disabled'));
		});
	});

	describe("4. Scale Sovereignty: Solo Doctor Mode (Mandate 8n)", () => {
		it("4.1. Works seamlessly with 1 doctor and 0 configured chairs", () => {
			const soloDashboard = {
				...mockDashboard,
				clinicSettings: {
					...mockDashboard.clinicSettings!,
					chairs: [],
					staff: [mockDoctors[0]!],
					profile: {
						mode: "solo_doctor",
						activeChairsCount: 1,
					},
				},
			} as unknown as Dashboard;

			const html = renderToString(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: soloDashboard,
					initialSlot: {
						dateKey: "2026-09-10",
						startTime: "10:00",
					},
				}),
			);

			expect(html).toContain(DEFAULT_SOLO_CHAIR.name);
			expect(html).toContain("Иванов");
		});
	});

	describe("5. Ergonomics, WCAG and Zero Emojis (Mandate 8d)", () => {
		it("5.1. Renders zero cartoon emojis in UI output", () => {
			const html = renderToString(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: mockDashboard,
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-10",
					},
				}),
			);

			const bannedEmojis = ["🦷", "📅", "⏰", "👨‍⚕️", "👩‍⚕️", "🏥", "🚨", "⚠️", "🔥"];
			for (const emoji of bannedEmojis) {
				assert.ok(
					!html.includes(emoji),
					`Found forbidden emoji "${emoji}" in QuickBookingDrawer output`,
				);
			}
		});
	});
});
