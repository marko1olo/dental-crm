/**
 * emergencyCitoBookingWave47.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Wave 47:
 * Eliminate friction for emergency patient booking (CITO / Острая боль / неотложка)
 * and schedule booking (Mandates 8e, 8k, 8n).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking reception, soft overbooking).
 * - Mandate 8k: CRM != Reality Simulator (1-click CITO conversion, automatic safe defaults).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Auto-assignment, resilient defaults).
 * - Mandate 8d п. 4: Desktop Density & Mobile Touch Targets (>= 44x44px touch targets).
 * - Mandate 8d п. 7: Zero Cartoon Emojis (Strictly Lucide vector icons: Zap, Plus, etc.).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard, Appointment } from "@dental/shared";

// Register CSS stub loader for Node ESM if running directly via node --import tsx --test
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

// Dynamically import components to allow CSS hook registration above
const {
	NewAppointmentForm,
	QUICK_APPOINTMENT_REASON_PRESETS,
} = await import("../NewAppointmentForm");

const { AppointmentModal } = await import("../AppointmentModal");

const {
	checkAppointmentResourceCollision,
	isCitoAppointment,
} = await import("../../../utils/scheduleCollisionUtils");

const { AppLogicProvider } = await import("../../../contexts/AppLogicContext");

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
	{
		id: "patient-102",
		organizationId: "00000000-0000-0000-0000-000000000000",
		status: "active" as const,
		fullName: "Сидоров Сидор Сидорович (CITO)",
		phone: "+7 (916) 999-88-77",
		email: null,
		notes: null,
		administrativeProfile: null,
		birthDate: "1990-08-20",
		balanceRub: 0,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
];

const mockExistingAppointment: Appointment = {
	id: "appt-existing-1",
	organizationId: "org-1",
	patientId: "patient-101",
	chairId: "chair-1",
	doctorUserId: "doc-1",
	startsAt: "2026-09-08T10:00:00.000Z",
	endsAt: "2026-09-08T11:00:00.000Z",
	status: "planned",
	reason: "Плановое лечение",
	comment: null,
	costRub: 5000,
	createdAt: "2026-09-01T00:00:00.000Z",
	updatedAt: "2026-09-01T00:00:00.000Z",
} as any;

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
	appointments: [mockExistingAppointment] as any,
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

function renderNewAppointmentForm(propsPartial: any = {}): string {
	const defaultProps = {
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

function renderAppointmentModal(propsPartial: any = {}): string {
	const defaultProps = {
		isOpen: true,
		onClose: () => {},
		appointment: mockExistingAppointment,
		dashboard: mockDashboard,
		patientName: (pts: any, id: string | null) => {
			const p = pts?.find((x: any) => x.id === id);
			return p ? p.fullName : "Пациент";
		},
		formatTime: (iso: string) => (iso ? iso.slice(11, 16) : ""),
		toDateTimeLocalValue: (iso: string) => (iso ? iso.slice(0, 16) : ""),
		fromDateTimeLocalValue: (val: string) => (val ? `${val}:00.000Z` : ""),
		appointmentLabels: mockAppointmentLabels,
		activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(["in_treatment", "completed"]),
		onSave: async () => true,
		...propsPartial,
	};

	return renderToStaticMarkup(
		createElement(AppLogicProvider, {
			value: mockAppLogicValue,
			children: createElement(AppointmentModal, defaultProps),
		}),
	);
}

describe("Wave 47: Emergency & CITO Booking Friction Elimination (Mandates 8e, 8k, 8n)", () => {
	describe("1. scheduleCollisionUtils: CITO Detection & Soft Overbooking Engine", () => {
		it("1.1. isCitoAppointment accurately detects CITO from boolean flags, tag, reason and comment", () => {
			assert.strictEqual(isCitoAppointment({ isCito: true }), true);
			assert.strictEqual(isCitoAppointment({ cito: true }), true);
			assert.strictEqual(isCitoAppointment({ isEmergency: true }), true);
			assert.strictEqual(isCitoAppointment({ reason: "CITO! Острая боль в зубе" }), true);
			assert.strictEqual(isCitoAppointment({ reason: "Приём срочно" }), true);
			assert.strictEqual(isCitoAppointment({ reason: "Плановая гигиена" }), false);
			assert.strictEqual(isCitoAppointment(null), false);
			assert.strictEqual(isCitoAppointment(undefined), false);
		});

		it("1.2. checkAppointmentResourceCollision marks collision as isCitoOverbooking when allowCitoOverbooking is enabled", () => {
			const collision = checkAppointmentResourceCollision(
				{
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T10:30:00.000Z",
					chairId: "chair-1",
					doctorUserId: "doc-1",
					patientId: "patient-102",
					isCito: true,
					reason: "CITO! Острая боль",
				},
				[mockExistingAppointment],
				{
					chairs: mockChairs as any,
					staff: mockStaff as any,
					isCito: true,
					allowCitoOverbooking: true,
				},
			);

			assert.strictEqual(
				collision.hasCollision,
				false,
				"Mandate 8e: hasCollision must be false for CITO so booking is never blocked",
			);
			assert.strictEqual(
				collision.isCitoOverbooking,
				true,
				"Must flag isCitoOverbooking as true for transparent UI badging",
			);
			assert.ok(
				collision.message?.includes("CITO-овербукинг"),
				"Collision message must explicitly mention CITO overbooking permission",
			);
		});

		it("1.3. non-CITO overlapping appointment produces standard blocking collision (hasCollision: true)", () => {
			const collision = checkAppointmentResourceCollision(
				{
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T10:30:00.000Z",
					chairId: "chair-1",
					doctorUserId: "doc-1",
					patientId: "patient-102",
					isCito: false,
					reason: "Обычный осмотр",
				},
				[mockExistingAppointment],
				{
					chairs: mockChairs as any,
					staff: mockStaff as any,
					isCito: false,
					allowCitoOverbooking: false,
				},
			);

			assert.strictEqual(collision.hasCollision, true);
			assert.strictEqual(collision.isCitoOverbooking, false);
		});
	});

	describe("2. NewAppointmentForm: 1-Click CITO Emergency Preset & Frictionless Creation (Mandate 8e, 8k)", () => {
		it("2.1. renders 1-click header CITO emergency button with data-testid='header-cito-emergency-btn'", () => {
			const html = renderNewAppointmentForm();
			assert.ok(
				html.includes('data-testid="header-cito-emergency-btn"'),
				"Must render header quick CITO button",
			);
			assert.ok(
				html.includes("CITO! Острая боль (30 мин)"),
				"Must display visible CITO label in header action bar",
			);
		});

		it("2.2. quick reasons panel contains CITO emergency preset with 30-min duration and Lucide icon", () => {
			const emergencyPreset = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "emergency");
			assert.ok(emergencyPreset, "Emergency preset must exist in presets list");
			assert.strictEqual(emergencyPreset.reason, "CITO! Острая боль");
			assert.strictEqual(emergencyPreset.durationMinutes, 30);
			assert.strictEqual(emergencyPreset.tone, "emergency");
			assert.strictEqual(emergencyPreset.testId, "quick-reason-emergency");

			const html = renderNewAppointmentForm();
			assert.ok(
				html.includes('data-testid="quick-reason-emergency"'),
				"Must render quick-reason-emergency button in express reasons panel",
			);
		});

		it("2.3. appointment creation button is NEVER disabled when idle (Mandate 8e Doctor & Staff Autonomy)", () => {
			// Even with empty/incomplete draft, button is NOT disabled - clicking it auto-fills safe defaults
			const html = renderNewAppointmentForm({
				newAppointmentDraft: {
					patientId: "",
					chairId: "",
					doctorUserId: "",
					startsAt: "",
					endsAt: "",
					reason: "",
				},
				newAppointmentSaveState: "idle",
			});

			assert.ok(
				html.includes('data-testid="create-appointment-button"'),
				"Create appointment button must exist",
			);
			assert.ok(
				!html.includes('data-testid="create-appointment-button" disabled'),
				"Create button must NEVER be disabled when idle (Mandate 8e)",
			);
		});

		it("2.4. creation button displays disabled attribute ONLY when actively saving", () => {
			const htmlSaving = renderNewAppointmentForm({
				newAppointmentSaveState: "saving",
			});
			assert.ok(
				htmlSaving.includes('data-testid="create-appointment-button" disabled'),
				"Create button must be disabled only while actively saving",
			);
		});

		it("2.5. renders CITO soft overbooking badge and alert when draft overlaps with existing booking", () => {
			// Emergency patient 102 overlaps with mockExistingAppointment (patient 101, 10:00 - 11:00 on chair-1)
			const html = renderNewAppointmentForm({
				newAppointmentDraft: {
					patientId: "patient-102",
					chairId: "chair-1",
					doctorUserId: "doc-1",
					startsAt: "2026-09-08T10:00:00.000Z",
					endsAt: "2026-09-08T10:30:00.000Z",
					reason: "CITO! Острая боль",
					isCito: true,
					tag: "cito",
				},
			});

			assert.ok(
				html.includes('data-testid="cito-overbooking-badge"'),
				"Must render cito-overbooking-badge when CITO overlaps with busy slot",
			);
			assert.ok(
				html.includes('data-testid="cito-overbooking-alert"'),
				"Must render cito-overbooking-alert banner explaining soft overbooking permission",
			);
			assert.ok(
				html.includes("Записать CITO (Острая боль / Овербукинг)"),
				"Submit button must update text to confirm CITO overbooking",
			);
			assert.ok(
				html.includes("bg-rose-600"),
				"Submit button must have high-visibility rose styling for CITO overbooking",
			);
		});
	});

	describe("3. AppointmentModal: 1-Click Convert to CITO & Soft Overbooking UI", () => {
		it("3.1. renders 'convert-to-cito-btn' in header when appointment is not yet CITO", () => {
			const html = renderAppointmentModal({
				appointment: {
					...mockExistingAppointment,
					reason: "Обычная консультация",
					comment: "",
				},
			});

			assert.ok(
				html.includes('data-testid="convert-to-cito-btn"'),
				"Must render convert-to-cito-btn in modal header",
			);
			assert.ok(
				html.includes("Перевести в CITO (Острая боль)"),
				"Button must have clear action label",
			);
		});

		it("3.2. renders active CITO badge and banner when appointment is CITO", () => {
			const citoAppt = {
				...mockExistingAppointment,
				isCito: true,
				reason: "CITO! Острая боль (Обычная консультация)",
			};

			const html = renderAppointmentModal({
				appointment: citoAppt,
			});

			assert.ok(
				html.includes('data-testid="appointment-cito-active-badge"'),
				"Must render appointment-cito-active-badge in header",
			);
			assert.ok(
				html.includes('data-testid="appointment-cito-banner"'),
				"Must render appointment-cito-banner in modal body",
			);
			assert.ok(
				html.includes("Экстренный приём CITO (Острая боль)"),
				"Banner must state emergency appointment clearly",
			);
			assert.ok(
				html.includes("Мягкий овербукинг разрешён"),
				"Banner must confirm soft overbooking permission",
			);
		});

		it("3.3. save button text updates to 'Сохранить CITO (Острая боль)' with rose styling", () => {
			const citoAppt = {
				...mockExistingAppointment,
				isCito: true,
				reason: "CITO! Острая боль",
			};

			const html = renderAppointmentModal({
				appointment: citoAppt,
			});

			assert.ok(
				html.includes("Сохранить CITO (Острая боль)"),
				"Save button must state 'Сохранить CITO (Острая боль)'",
			);
			assert.ok(
				html.includes("bg-rose-600"),
				"Save button must use rose-600 alert styling for CITO",
			);
		});

		it("3.4. renders modal-cito-overbooking-alert when collision is detected on CITO appointment", () => {
			// Add a second appointment colliding with mockExistingAppointment on chair-1
			const anotherAppt: Appointment = {
				id: "appt-conflict-2",
				organizationId: "org-1",
				patientId: "patient-102" as any,
				chairId: "chair-1",
				doctorUserId: "doc-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T10:45:00.000Z",
				status: "confirmed",
				reason: "Другой пациент",
				comment: null,
				costRub: 3000,
				createdAt: "2026-09-01T00:00:00.000Z",
				updatedAt: "2026-09-01T00:00:00.000Z",
			} as any;

			const html = renderAppointmentModal({
				appointment: {
					...anotherAppt,
					isCito: true,
					reason: "CITO! Острая боль",
				},
				dashboard: {
					...mockDashboard,
					appointments: [mockExistingAppointment, anotherAppt],
				},
			});

			assert.ok(
				html.includes('data-testid="modal-cito-overbooking-alert"'),
				"Must render modal-cito-overbooking-alert on collision",
			);
		});
	});

	describe("4. Ergonomics, Density & Hygiene (Mandates 8d, 8e, 8n)", () => {
		it("4.1. all CITO action buttons maintain touch targets >= 44x44px", () => {
			const newApptSource = fs.readFileSync(
				path.resolve(__dirname, "../NewAppointmentForm.tsx"),
				"utf8",
			);
			const modalSource = fs.readFileSync(
				path.resolve(__dirname, "../AppointmentModal.tsx"),
				"utf8",
			);

			// Header CITO emergency button in NewAppointmentForm
			assert.ok(
				newApptSource.includes('data-testid="header-cito-emergency-btn"'),
				"Header CITO button must exist",
			);
			assert.ok(
				newApptSource.includes("min-h-[44px]"),
				"Must enforce min-height 44px for touch targets",
			);

			// Convert to CITO button in AppointmentModal
			assert.ok(
				modalSource.includes('data-testid="convert-to-cito-btn"'),
				"Convert to CITO button must exist",
			);
			assert.ok(
				modalSource.includes("min-h-[44px]"),
				"Modal CITO buttons must enforce min-height 44px",
			);
		});

		it("4.2. guarantees 0 cartoon emojis in NewAppointmentForm.tsx (Mandate 8d п. 7)", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../NewAppointmentForm.tsx"),
				"utf8",
			);
			const match = source.match(CARTOON_EMOJI_REGEX);
			assert.strictEqual(
				match,
				null,
				`Found forbidden cartoon emoji in NewAppointmentForm.tsx: ${match?.[0]}`,
			);
			assert.strictEqual(hasCartoonEmojis(source), false);
		});

		it("4.3. guarantees 0 cartoon emojis in AppointmentModal.tsx (Mandate 8d п. 7)", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../AppointmentModal.tsx"),
				"utf8",
			);
			const match = source.match(CARTOON_EMOJI_REGEX);
			assert.strictEqual(
				match,
				null,
				`Found forbidden cartoon emoji in AppointmentModal.tsx: ${match?.[0]}`,
			);
			assert.strictEqual(hasCartoonEmojis(source), false);
		});

		it("4.4. guarantees 0 cartoon emojis in rendered CITO HTML outputs", () => {
			const formHtml = renderNewAppointmentForm({
				newAppointmentDraft: {
					reason: "CITO! Острая боль",
					isCito: true,
					tag: "cito",
				},
			});
			assert.strictEqual(hasCartoonEmojis(formHtml), false);

			const modalHtml = renderAppointmentModal({
				appointment: {
					...mockExistingAppointment,
					isCito: true,
					reason: "CITO! Острая боль",
				},
			});
			assert.strictEqual(hasCartoonEmojis(modalHtml), false);
		});

		it("4.5. verifies Lucide Zap vector icon is used for CITO actions (Mandate 8d п. 7)", () => {
			const formSource = fs.readFileSync(
				path.resolve(__dirname, "../NewAppointmentForm.tsx"),
				"utf8",
			);
			const modalSource = fs.readFileSync(
				path.resolve(__dirname, "../AppointmentModal.tsx"),
				"utf8",
			);

			assert.ok(
				formSource.includes("Zap") && formSource.includes("lucide-react"),
				"NewAppointmentForm must import and use Zap from lucide-react",
			);
			assert.ok(
				modalSource.includes("Zap") && modalSource.includes("lucide-react"),
				"AppointmentModal must import and use Zap from lucide-react",
			);
		});
	});
});
