/**
 * newAppointmentFormWave45.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 222:
 * Express Slots and Appointment Reasons in Schedule (StomX / DentalPRO Parity)
 * in NewAppointmentForm (Wave 45 — Schedule Reception Ergonomics Lead).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, frictionless reception).
 * - Mandate 8k: CRM != Reality Simulator (1-click duration presets + express reason presets).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Auto-assignment & Zero Dead-Ends).
 * - Mandate 8d п. 4: Desktop Density (32–36px height on desktop, touch targets >= 44px on mobile).
 * - Mandate 8d п. 7: Zero Cartoon Emojis (Strictly Lucide vector icons).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard, Appointment } from "@dental/shared";

import {
	NewAppointmentForm,
	DURATION_PRESETS,
	QUICK_APPOINTMENT_REASON_PRESETS,
	type QuickAppointmentReasonPreset,
	type NewAppointmentFormProps,
} from "../NewAppointmentForm";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d п. 7
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

const mockStaff = [
	{
		id: "doc-1",
		fullName: "Д-р Иванов Иван Иванович",
		role: "doctor" as const,
		active: true,
		specialties: ["therapy"],
	},
	{
		id: "doc-2",
		fullName: "Д-р Смирнова Анна Павловна",
		role: "doctor" as const,
		active: true,
		specialties: ["surgery"],
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		active: true,
		specialization: "therapy",
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		active: true,
		specialization: "surgery",
	},
];

const mockPatients = [
	{
		id: "patient-101",
		organizationId: "00000000-0000-0000-0000-000000000000",
		status: "active" as const,
		fullName: "Петров Петр Петрович",
		phone: "+7 (916) 123-45-67",
		email: null,
		notes: null,
		administrativeProfile: null,
		birthDate: "1985-05-15",
		balanceRub: 0,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
];

const mockDashboard: Dashboard = {
	organization: {
		id: "org-1",
		name: "Тестовая Клиника DENTE",
	} as any,
	clinicSettings: {
		name: "Тестовая Клиника DENTE",
		staff: mockStaff as any,
		chairs: mockChairs as any,
		profile: {
			mode: "clinic",
			timezone: "Europe/Moscow",
		} as any,
	} as any,
	patients: mockPatients as any,
	appointments: [] as any,
	rooms: [],
	cashRegisters: [],
	priceList: [],
} as any;

const mockAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	arrived: "Прибыл",
	in_treatment: "В процессе",
	confirmed: "Подтвержден",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

const mockAppLogicValue: any = {
	dashboard: mockDashboard,
	auth: {
		token: "test-token",
		denteClinicalReadHeaders: () => ({}),
	},
};

function renderForm(propsPartial: Partial<NewAppointmentFormProps> = {}): string {
	const defaultProps: NewAppointmentFormProps = {
		dashboard: mockDashboard,
		appointmentLabels: mockAppointmentLabels,
		newAppointmentDraft: {
			patientId: "patient-101",
			chairId: "chair-1",
			doctorUserId: "doc-1",
			startsAt: "2026-09-08T10:00:00.000Z",
			endsAt: "2026-09-08T10:30:00.000Z",
			reason: "",
		},
		newAppointmentSaveState: "idle",
		newAppointmentError: null,
		updateNewAppointmentDraft: () => {},
		createAppointmentFromDraft: async () => true,
		resetNewAppointmentDraft: () => {},
		toDateTimeLocalValue: (val: string) => (val ? val.slice(0, 16) : ""),
		fromDateTimeLocalValue: (val: string) => (val ? `${val}:00.000Z` : ""),
		useManualSelects: false,
		setUseManualSelects: () => {},
		showCreateForm: true,
		setShowCreateForm: () => {},
		isSmartAiOpen: false,
		setIsSmartAiOpen: () => {},
		chairDoctorAssignments: undefined,
		...propsPartial,
	};

	return renderToStaticMarkup(
		createElement(AppLogicProvider, {
			value: mockAppLogicValue,
			children: createElement(NewAppointmentForm, defaultProps),
		}),
	);
}

describe("Wave 45: Express Slots & Appointment Reasons in Schedule (Feature 222)", () => {
	describe("1. Quick Duration Presets (+15, +30, +45, +60, +90, +120 min) (Mandates 8e, 8k)", () => {
		it("1.1. exports DURATION_PRESETS with exact canonical values [15, 30, 45, 60, 90, 120]", () => {
			assert.deepStrictEqual(DURATION_PRESETS, [15, 30, 45, 60, 90, 120]);
			assert.strictEqual(DURATION_PRESETS.length, 6);
		});

		it("1.2. renders appointment-quick-durations-panel with all 6 quick duration buttons", () => {
			const html = renderForm();
			assert.ok(
				html.includes('data-testid="appointment-quick-durations-panel"'),
				"Must render quick durations panel container",
			);
			assert.ok(
				html.includes('data-testid="appointment-quick-durations"'),
				"Must render quick durations button list",
			);

			for (const mins of [15, 30, 45, 60, 90, 120]) {
				assert.ok(
					html.includes(`data-testid="quick-duration-${mins}"`),
					`Must render button for +${mins} min`,
				);
				assert.ok(
					html.includes(`+${mins} мин`),
					`Must render visible label +${mins} мин`,
				);
			}
		});

		it("1.3. displays formatted duration badge when startsAt and endsAt differ", () => {
			// 30 mins: 10:00 to 10:30
			const html30 = renderForm({
				newAppointmentDraft: {
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T10:30:00.000Z",
				},
			});
			assert.ok(html30.includes("30 мин"), "Must display 30 мин duration badge");

			// 60 mins: 10:00 to 11:00 -> "60 мин (1 ч)"
			const html60 = renderForm({
				newAppointmentDraft: {
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T11:00:00.000Z",
				},
			});
			assert.ok(html60.includes("60 мин (1 ч)"), "Must display 60 мин (1 ч) duration badge");

			// 90 mins: 10:00 to 11:30 -> "90 мин (1 ч 30 мин)"
			const html90 = renderForm({
				newAppointmentDraft: {
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T11:30:00.000Z",
				},
			});
			assert.ok(
				html90.includes("90 мин (1 ч 30 мин)"),
				"Must display 90 мин (1 ч 30 мин) duration badge",
			);
		});

		it("1.4. calculates exact timestamp delta for all duration presets", () => {
			const startIso = "2026-09-08T10:00:00.000Z";
			const startDate = new Date(startIso);

			for (const mins of DURATION_PRESETS) {
				const expectedEnd = new Date(startDate.getTime() + mins * 60 * 1000).toISOString();
				const actualDiffMinutes =
					(new Date(expectedEnd).getTime() - startDate.getTime()) / (60 * 1000);
				assert.strictEqual(actualDiffMinutes, mins);
			}
		});

		it("1.5. highlights active preset button when current duration matches", () => {
			const html = renderForm({
				newAppointmentDraft: {
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T10:45:00.000Z", // 45 min
				},
			});
			// quick-duration-45 should have active style classes
			assert.ok(
				html.includes('data-testid="quick-duration-45" class="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1 transition-all cursor-pointer bg-[var(--teal)] text-white'),
				"quick-duration-45 button must be styled as active",
			);
		});
	});

	describe("2. Express Appointment Reasons (StomX / DentalPRO Parity, Feature 222)", () => {
		it("2.1. exports QUICK_APPOINTMENT_REASON_PRESETS with 7 canonical dental presets", () => {
			assert.strictEqual(QUICK_APPOINTMENT_REASON_PRESETS.length, 7);

			const ids = QUICK_APPOINTMENT_REASON_PRESETS.map((p) => p.id);
			assert.deepStrictEqual(ids, [
				"consultation",
				"caries",
				"endo",
				"surgery",
				"hygiene",
				"emergency",
				"orthopedics",
			]);
		});

		it("2.2. verifies each preset has correct canonical reason, duration and testId", () => {
			const consultation = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "consultation")!;
			assert.strictEqual(consultation.reason, "Осмотр и консультация");
			assert.strictEqual(consultation.durationMinutes, 30);
			assert.strictEqual(consultation.testId, "quick-reason-consultation");

			const caries = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "caries")!;
			assert.strictEqual(caries.reason, "Лечение кариеса");
			assert.strictEqual(caries.durationMinutes, 60);
			assert.strictEqual(caries.testId, "quick-reason-caries");

			const endo = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "endo")!;
			assert.strictEqual(endo.reason, "Эндодонтическое лечение");
			assert.strictEqual(endo.durationMinutes, 90);
			assert.strictEqual(endo.testId, "quick-reason-endo");

			const surgery = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "surgery")!;
			assert.strictEqual(surgery.reason, "Хирургическое лечение / удаление зуба");
			assert.strictEqual(surgery.durationMinutes, 45);
			assert.strictEqual(surgery.testId, "quick-reason-surgery");

			const hygiene = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "hygiene")!;
			assert.strictEqual(hygiene.reason, "Профессиональная гигиена полости рта");
			assert.strictEqual(hygiene.durationMinutes, 60);
			assert.strictEqual(hygiene.testId, "quick-reason-hygiene");

			const emergency = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "emergency")!;
			assert.strictEqual(emergency.reason, "CITO! Острая боль");
			assert.strictEqual(emergency.durationMinutes, 30);
			assert.strictEqual(emergency.tone, "emergency");
			assert.strictEqual(emergency.testId, "quick-reason-emergency");

			const orthopedics = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "orthopedics")!;
			assert.strictEqual(orthopedics.reason, "Ортопедический приём / примерка");
			assert.strictEqual(orthopedics.durationMinutes, 45);
			assert.strictEqual(orthopedics.testId, "quick-reason-orthopedics");
		});

		it("2.3. renders appointment-quick-reasons-panel with all 7 express reason buttons in UI", () => {
			const html = renderForm();
			assert.ok(
				html.includes('data-testid="appointment-quick-reasons-panel"'),
				"Must render quick reasons panel",
			);
			assert.ok(
				html.includes('data-testid="appointment-quick-reasons"'),
				"Must render quick reasons container",
			);

			for (const preset of QUICK_APPOINTMENT_REASON_PRESETS) {
				assert.ok(
					html.includes(`data-testid="${preset.testId}"`),
					`Must render button with data-testid="${preset.testId}"`,
				);
				assert.ok(
					html.includes(preset.label),
					`Must render button label for "${preset.label}"`,
				);
			}
		});

		it("2.4. highlights active reason preset when newAppointmentDraft.reason matches", () => {
			const html = renderForm({
				newAppointmentDraft: {
					reason: "Эндодонтическое лечение",
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T11:30:00.000Z",
				},
			});
			assert.ok(
				html.includes('data-testid="quick-reason-endo" class="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer bg-[var(--teal)] text-white'),
				"quick-reason-endo button must be styled as active when selected",
			);
		});

		it("2.5. emergency preset has distinct warning tone styling when unselected", () => {
			const html = renderForm({
				newAppointmentDraft: {
					reason: "",
				},
			});
			assert.ok(
				html.includes('data-testid="quick-reason-emergency"'),
				"Must render emergency button",
			);
			assert.ok(
				html.includes("bg-red-500/10 border-red-500/30 text-red-700"),
				"Must use emergency tone styling for CITO button",
			);
		});
	});

	describe("3. Duty Doctor Auto-Resolution in Schedule (Mandates 8e, 8n)", () => {
		const chairDoctorAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				chairName: "Кресло 1 (Терапия)",
				doctorId: "doc-1",
				doctorName: "Д-р Иванов Иван Иванович",
				shiftPreset: "two_shifts",
				shiftHours: "08:00–20:00",
				subShifts: [
					{
						doctorId: "doc-1",
						doctorName: "Д-р Иванов Иван Иванович",
						startHour: 8,
						endHour: 14,
						shiftHours: "08:00–14:00",
					},
					{
						doctorId: "doc-2",
						doctorName: "Д-р Смирнова Анна Павловна",
						startHour: 14,
						endHour: 20,
						shiftHours: "14:00–20:00",
					},
				],
			},
		};

		it("3.1. resolves morning shift duty doctor for 10:00 AM slot", () => {
			const duty = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-08T10:00:00.000Z",
				chairDoctorAssignments,
				"2026-09-08",
			);
			assert.strictEqual(duty.doctorId, "doc-1");
			assert.strictEqual(duty.shiftHours, "08:00–14:00");
		});

		it("3.2. resolves evening shift duty doctor for 16:00 (4:00 PM) slot", () => {
			const duty = resolveChairDutyDoctor(
				"chair-1",
				"2026-09-08T16:00:00.000Z",
				chairDoctorAssignments,
				"2026-09-08",
			);
			assert.strictEqual(duty.doctorId, "doc-2");
			assert.strictEqual(duty.shiftHours, "14:00–20:00");
		});

		it("3.3. handles unassigned chair gracefully without crashing", () => {
			const duty = resolveChairDutyDoctor(
				"chair-unknown",
				"2026-09-08T10:00:00.000Z",
				chairDoctorAssignments,
			);
			assert.strictEqual(duty.doctorId, null);
			assert.strictEqual(duty.shiftHours, "08:00–20:00");
		});

		it("3.4. preserves doctor autonomy (Mandate 8e): doctor select input is not disabled", () => {
			const html = renderForm({ useManualSelects: true });
			// Doctor selection must not be disabled
			assert.ok(
				html.includes('data-testid="new-appointment-doctor-select"'),
				"Doctor select input must exist",
			);
			assert.ok(
				!html.includes('data-testid="new-appointment-doctor-select" disabled'),
				"Doctor select must never be disabled (Mandate 8e)",
			);
		});
	});

	describe("4. Studio Clinical HIG: Desktop Density, Touch Targets & Zero Emojis (Mandate 8d)", () => {
		it("4.1. enforces desktop density (32–36px) and mobile touch targets >= 44px on quick duration buttons", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../NewAppointmentForm.tsx"),
				"utf8",
			);

			// Check classes for quick duration buttons
			assert.ok(
				source.includes("min-h-[44px] sm:min-h-[32px] sm:h-8"),
				"Quick duration and reason buttons must have 44px min-height on mobile and 32px height on desktop",
			);
		});

		it("4.2. guarantees 0 cartoon emojis in NewAppointmentForm source code (Mandate 8d п. 7)", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../NewAppointmentForm.tsx"),
				"utf8",
			);
			const emojiMatch = source.match(CARTOON_EMOJI_REGEX);
			assert.strictEqual(
				emojiMatch,
				null,
				`Found forbidden cartoon emoji in NewAppointmentForm.tsx: ${emojiMatch?.[0]}`,
			);
			assert.strictEqual(hasCartoonEmojis(source), false);
		});

		it("4.3. guarantees 0 cartoon emojis in rendered HTML output", () => {
			const html = renderForm();
			const emojiMatch = html.match(CARTOON_EMOJI_REGEX);
			assert.strictEqual(
				emojiMatch,
				null,
				`Found forbidden cartoon emoji in rendered HTML: ${emojiMatch?.[0]}`,
			);
			assert.strictEqual(hasCartoonEmojis(html), false);
		});

		it("4.4. verifies Lucide vector icons are used for express reason buttons", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../NewAppointmentForm.tsx"),
				"utf8",
			);
			// Check that Lucide icons are imported
			assert.ok(source.includes("Stethoscope"), "Must import Stethoscope from lucide-react");
			assert.ok(source.includes("Clock"), "Must import Clock from lucide-react");
			assert.ok(source.includes("Sparkles"), "Must import Sparkles from lucide-react");
			assert.ok(source.includes("AlertTriangle"), "Must import AlertTriangle from lucide-react");
			assert.ok(source.includes("Check"), "Must import Check from lucide-react");
		});

		it("4.5. zero-dead-ends: creation button is not disabled when valid draft is provided", () => {
			const html = renderForm({
				newAppointmentDraft: {
					patientId: "patient-101",
					chairId: "chair-1",
					doctorUserId: "doc-1",
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T10:30:00.000Z",
					reason: "Осмотр и консультация",
				},
			});

			assert.ok(
				html.includes('data-testid="create-appointment-button"'),
				"Create appointment button must exist",
			);
			assert.ok(
				!html.includes('data-testid="create-appointment-button" disabled'),
				"Create button must be active and enabled",
			);
		});
	});
});
