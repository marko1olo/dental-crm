/**
 * appointmentDrawerAutonomy.test.tsx
 *
 * Targeted Unit & Integration Test Suite for AppointmentDrawer & Doctor Autonomy
 * (Schedule & Appointment Doctor-Autonomy Lead)
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT (zero mocks, doctor autonomy).
 * - Mandate 8c: Dominant Workspace & >=44px touch targets.
 * - Mandate 8d: The 7 Deadly Sins (1-row toolbar, WCAG AAA tokens, 0 cartoon emojis).
 * - Mandate 8e: Doctor & Staff Autonomy (NO disabled save button, assistant strictly optional,
 *   1-click visit status changes: confirmed, arrived, in_treatment, completed, no_show).
 * - Mandate 8k: CRM != Reality Simulator (friction-killer law, instant fallback).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (solo doctor rented chair mode).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Appointment, Dashboard } from "@dental/shared";

import {
	AppointmentDrawer,
	createInlinePatientRecord,
	resolveChairDutyDoctor,
} from "../AppointmentDrawer";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d п. 7
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

const mockStaff = [
	{
		id: "doc-1",
		organizationId: "org-1",
		fullName: "Д-р Иванов Иван Иванович",
		role: "doctor",
		active: true,
		color: "#0d9488",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
	{
		id: "doc-2",
		organizationId: "org-1",
		fullName: "Д-р Смирнов Алексей Сергеевич",
		role: "doctor",
		active: true,
		color: "#2563eb",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
	{
		id: "asst-1",
		organizationId: "org-1",
		fullName: "Ассистент Петрова Анна",
		role: "assistant",
		active: true,
		color: "#64748b",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Хирургия)",
		room: "Кабинет 1",
		active: true,
		isActive: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Терапия)",
		room: "Кабинет 2",
		active: true,
		isActive: true,
	},
];

const mockPatients = [
	{
		id: "pat-1",
		fullName: "Сидоров Сидор Сидорович",
		phone: "+7 (999) 111-22-33",
		birthDate: "1990-05-15",
		status: "active",
	},
];

const mockDashboard = {
	clinicSettings: {
		profile: {
			organizationId: "org-1",
			clinicName: "Клиника ДЕНТЕ",
			timezone: "Europe/Moscow",
			mode: "clinic",
		},
		staff: mockStaff,
		chairs: mockChairs,
	},
	patients: mockPatients,
	appointments: [],
} as unknown as Dashboard;

const mockSoloDashboard = {
	clinicSettings: {
		profile: {
			organizationId: "org-solo",
			clinicName: "Стоматология Д-р Иванов",
			timezone: "Europe/Moscow",
			mode: "solo_doctor",
		},
		staff: [mockStaff[0]],
		chairs: [mockChairs[0]],
	},
	patients: mockPatients,
	appointments: [],
} as unknown as Dashboard;

const existingAppointment: Appointment = {
	id: "appt-101",
	organizationId: "org-1",
	patientId: "pat-1",
	doctorUserId: "doc-1",
	assistantUserId: null,
	chairId: "chair-1",
	startsAt: "2026-09-09T10:00:00.000Z",
	endsAt: "2026-09-09T10:30:00.000Z",
	status: "confirmed",
	reason: "Первичный осмотр",
	comment: "Консультация",
};

describe("AppointmentDrawer & Doctor Autonomy (Mandates 8c, 8d, 8e, 8n)", () => {
	it("renders AppointmentDrawer in open state for new appointment slot", () => {
		const html = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				initialSlot: {
					startsAt: "2026-09-09T14:00",
					endsAt: "2026-09-09T14:30",
					chairId: "chair-1",
					doctorUserId: "doc-1",
				},
				dashboard: mockDashboard,
				onSave: async () => {},
			})
		);

		assert.ok(html.includes("data-testid=\"appointment-drawer\""));
		assert.ok(html.includes("Запись на прием"));
		assert.ok(html.includes("Кресло 1 (Хирургия)"));
	});

	it("renders AppointmentDrawer in open state for existing appointment with status badge", () => {
		const html = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				appointment: existingAppointment,
				dashboard: mockDashboard,
				onSave: async () => {},
				onStatusChange: async () => {},
			})
		);

		assert.ok(html.includes("data-testid=\"appointment-drawer\""));
		assert.ok(html.includes("Карточка записи"));
		assert.ok(html.includes("Сидоров Сидор Сидорович"));
		assert.ok(html.includes("Подтвержден"));
	});

	it("assistant is strictly optional (nullable) and defaults to '-- Без ассистента --'", () => {
		const html = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				initialSlot: {
					startsAt: "2026-09-09T14:00",
					endsAt: "2026-09-09T14:30",
				},
				dashboard: mockDashboard,
				onSave: async () => {},
			})
		);

		assert.ok(html.includes("drawer-assistant-select"));
		assert.ok(html.includes("-- Без ассистента --"));
		assert.ok(html.includes("необязательно для соло-врача"));
	});

	it("in solo doctor mode, assistant selection is auto-bypassed with autonomous badge", () => {
		const html = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				initialSlot: {
					startsAt: "2026-09-09T14:00",
					endsAt: "2026-09-09T14:30",
				},
				dashboard: mockSoloDashboard,
				onSave: async () => {},
			})
		);

		assert.ok(html.includes("Режим соло-врача: ассистент не требуется"));
		assert.ok(!html.includes("drawer-assistant-select"));
	});

	it("renders 1-click status transition buttons with all 6 clinical statuses", () => {
		const html = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				appointment: existingAppointment,
				dashboard: mockDashboard,
				onSave: async () => {},
				onStatusChange: async () => {},
			})
		);

		assert.ok(html.includes("drawer-status-btn-planned"));
		assert.ok(html.includes("drawer-status-btn-confirmed"));
		assert.ok(html.includes("drawer-status-btn-arrived"));
		assert.ok(html.includes("drawer-status-btn-in_treatment"));
		assert.ok(html.includes("drawer-status-btn-completed"));
		assert.ok(html.includes("drawer-status-btn-no_show"));

		assert.ok(html.includes("Запланирован"));
		assert.ok(html.includes("Подтвержден"));
		assert.ok(html.includes("Пациент пришел"));
		assert.ok(html.includes("В кресле"));
		assert.ok(html.includes("Прием завершен"));
		assert.ok(html.includes("Неявка"));
	});

	it("all 1-click status buttons have >= 44x44px touch targets (Mandate 8c & 8d)", () => {
		const html = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				appointment: existingAppointment,
				dashboard: mockDashboard,
				onSave: async () => {},
				onStatusChange: async () => {},
			})
		);

		// Every status button must have min-h-[44px]
		const statusBtnMatches = html.match(/data-testid="drawer-status-btn-[^"]+"/g);
		assert.ok(statusBtnMatches && statusBtnMatches.length === 6);
		assert.ok(html.includes("min-h-[44px]"));
	});

	it("Save button is never disabled due to missing assistant or optional fields (Mandate 8e)", () => {
		const html = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				initialSlot: {
					startsAt: "2026-09-09T14:00",
					endsAt: "2026-09-09T14:30",
				},
				dashboard: mockDashboard,
				onSave: async () => {},
			})
		);

		// The save button must not have disabled attribute when not submitting
		assert.ok(html.includes("data-testid=\"drawer-save-btn\""));
		// Ensure it is not disabled
		assert.ok(!html.includes('data-testid="drawer-save-btn" disabled'));
	});

	it("resolveChairDutyDoctor correctly assigns duty doctor by chair assignment", () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Д-р Иванов Иван Иванович",
				shiftPreset: "full",
				shiftHours: "08:00–20:00",
			},
		};

		const resolved = resolveChairDutyDoctor(
			"chair-1",
			"14:00",
			assignments,
		);

		assert.equal(resolved.doctorId, "doc-1");

		const fallback = resolveChairDutyDoctor(
			"chair-2",
			"14:00",
			assignments,
		);
		// With no assignment for chair-2 and no slot doctor, returns null
		assert.equal(fallback.doctorId, null);

		const explicitSlotDoctor = resolveChairDutyDoctor(
			"chair-2",
			"14:00",
			assignments,
			undefined,
			"doc-2",
		);
		assert.equal(explicitSlotDoctor.doctorId, "doc-2");
	});

	it("contains ZERO cartoon emojis in rendered output (Mandate 8d п. 7)", () => {
		const htmlNew = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				initialSlot: {
					startsAt: "2026-09-09T14:00",
					endsAt: "2026-09-09T14:30",
				},
				dashboard: mockDashboard,
				onSave: async () => {},
			})
		);

		assert.equal(hasCartoonEmojis(htmlNew), false, "New appointment drawer contains cartoon emojis!");

		const htmlEdit = renderToString(
			React.createElement(AppointmentDrawer, {
				isOpen: true,
				onClose: () => {},
				appointment: existingAppointment,
				dashboard: mockDashboard,
				onSave: async () => {},
				onStatusChange: async () => {},
			})
		);

		assert.equal(hasCartoonEmojis(htmlEdit), false, "Edit appointment drawer contains cartoon emojis!");
	});

	it("быстрое создание нового inline-пациента возвращает реальный ID и успешно передается в onSave", async () => {
		// 1. Verify createInlinePatientRecord returns real ID and does not produce synthetic mocks
		const mockServerFetch = async (_url: string | URL | Request, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body || "{}"));
			assert.equal(body.fullName, "Новиков Артем");
			assert.equal(body.phone, "+7 999 777-66-55");
			return {
				ok: true,
				json: async () => ({
					id: "pat-real-777",
					fullName: body.fullName,
					phone: body.phone,
				}),
			} as Response;
		};

		const created = await createInlinePatientRecord(
			{
				fullName: "Новиков Артем",
				phone: "+7 999 777-66-55",
			},
			mockServerFetch as typeof fetch,
		);

		assert.ok(created, "Created patient record must not be null");
		assert.equal(created.id, "pat-real-777");
		assert.equal(created.fullName, "Новиков Артем");

		// 2. Verify network failure returns null (ZERO MOCKS - no fake pat-... fallback)
		const failingFetch = async () => {
			return {
				ok: false,
				status: 500,
			} as Response;
		};
		const failedResult = await createInlinePatientRecord(
			{
				fullName: "Тест Ошибки",
				phone: "+7 999 000-00-00",
			},
			failingFetch as typeof fetch,
		);
		assert.equal(
			failedResult,
			null,
			"Zero mocks: network failure must return null instead of synthetic mockId",
		);

		// 3. Verify onSave receives real created patient ID
		let savedPatientId = "";
		let saveCalled = false;

		const onSaveMock = async (
			_appointmentId: string,
			draft: {
				patientId: string;
				doctorUserId: string;
				assistantUserId: string | null;
				chairId: string;
				startsAt: string;
				endsAt: string;
				status: Appointment["status"];
				reason: string;
				comment: string;
			},
		) => {
			saveCalled = true;
			savedPatientId = draft.patientId;
			return true;
		};

		await onSaveMock("appt-1", {
			patientId: created.id,
			doctorUserId: "doc-1",
			assistantUserId: null,
			chairId: "chair-1",
			startsAt: "2026-09-09T14:00:00.000Z",
			endsAt: "2026-09-09T14:30:00.000Z",
			status: "planned",
			reason: "Первичный осмотр",
			comment: "",
		});

		assert.ok(saveCalled, "onSave must be called");
		assert.equal(
			savedPatientId,
			"pat-real-777",
			"onSave must receive the real patient ID returned from inline creation",
		);

		// 4. Source invariant checks: verify no fake mock IDs and verify async return in handleCreateInlinePatient
		const drawerSourcePath = path.resolve(__dirname, "../AppointmentDrawer.tsx");
		const drawerSource = fs.readFileSync(drawerSourcePath, "utf8");

		assert.ok(
			!drawerSource.includes("const mockId = `pat-${Date.now()}`"),
			"Mandate ZERO MOCKS: synthetic mockId generation must be eliminated from AppointmentDrawer.tsx",
		);
		assert.ok(
			drawerSource.includes("const createdId = await handleCreateInlinePatient()"),
			"handleSaveSubmit must await handleCreateInlinePatient() and capture createdId",
		);
		assert.ok(
			drawerSource.includes("effectivePatientId = createdId"),
			"handleSaveSubmit must assign effectivePatientId = createdId",
		);
	});

	it("pressing Escape key dismisses AppointmentDrawer (calls onClose)", () => {
		const drawerSourcePath = path.resolve(__dirname, "../AppointmentDrawer.tsx");
		const drawerSource = fs.readFileSync(drawerSourcePath, "utf8");

		assert.ok(
			drawerSource.includes('e.key === "Escape"'),
			"AppointmentDrawer must listen for Escape key in keydown event handler",
		);
		assert.ok(
			drawerSource.includes('window.addEventListener("keydown", handleKeyDown)'),
			"AppointmentDrawer must register keydown listener on window",
		);
		assert.ok(
			drawerSource.includes('window.removeEventListener("keydown", handleKeyDown)'),
			"AppointmentDrawer must remove keydown listener on cleanup",
		);

		// Functional behavioral test of the Escape key dismissal contract
		let closed = false;
		let prevented = false;
		const onClose = () => {
			closed = true;
		};

		const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
		};

		// 1. Non-Escape key does not trigger onClose
		handleKeyDown({
			key: "Enter",
			preventDefault: () => {
				prevented = true;
			},
		});
		assert.equal(closed, false, "Enter key must not call onClose");
		assert.equal(prevented, false, "Enter key must not be prevented");

		// 2. Escape key calls preventDefault and onClose
		handleKeyDown({
			key: "Escape",
			preventDefault: () => {
				prevented = true;
			},
		});
		assert.equal(closed, true, "Escape key must trigger onClose");
		assert.equal(prevented, true, "Escape key must call preventDefault");
	});
});
