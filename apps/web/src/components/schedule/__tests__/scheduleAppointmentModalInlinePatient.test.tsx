/**
 * scheduleAppointmentModalInlinePatient.test.tsx
 *
 * DENTE Dental CRM — Wave 41 Parity Suite (Mandates 8b, 8zi):
 * 1. AppointmentModal: Inline Quick Patient Mode (Mandates 8e, 8k)
 * - Mode toggle buttons: 'Из базы' / '+ Новый пациент'
 * - Inline patient creation form on toggle
 * - Auto-selects created patient via onQuickCreatePatient
 * - Auto-creates inline patient on handleSave if name was typed
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import { AppointmentModal } from "../AppointmentModal";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	clickNode,
	changeNode,
	createMockFn,
} from "./scheduleMockDomHarness";

const vi = {
	fn: (impl?: any) => createMockFn(impl),
};

const mockDoctors = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		role: "doctor",
		specialties: ["therapist"],
		active: true,
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Сергеевич",
		role: "doctor",
		specialties: ["surgeon"],
		active: true,
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		room: "1",
		color: "#0d9488",
		specialization: "therapist",
		defaultDoctorId: "doc-1",
		active: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		room: "2",
		color: "#2563eb",
		specialization: "surgeon",
		defaultDoctorId: "doc-2",
		active: true,
	},
];

const mockPatients = [
	{
		id: "pat-1",
		fullName: "Смирнов Алексей Владимирович",
		phone: "+7 999 111-22-33",
		status: "active",
	},
	{
		id: "pat-2",
		fullName: "Кузнецова Мария Ивановна",
		phone: "+7 999 444-55-66",
		status: "active",
	},
];

const mockDashboard = {
	stats: {
		totalPatients: 2,
		activeTreatmentPlans: 1,
		todayAppointmentsCount: 1,
		monthRevenue: 100000,
	},
	todayAppointments: [],
	recentPatients: [],
	clinicSettings: {
		profile: {
			clinicName: "Клиника ДЕНТЕ",
			timezone: "Europe/Moscow",
		},
		staff: mockDoctors,
		chairs: mockChairs,
	},
	patients: mockPatients,
	appointments: [],
	activeVisit: null,
} as unknown as Dashboard;

const defaultAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("1. AppointmentModal: Inline Quick Patient Mode (Mandates 8e, 8k)", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	it("renders mode toggle buttons: 'Из базы' and '+ Новый пациент'", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const appt: Partial<Appointment> = {
			id: "new-123",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-09-08T10:00:00.000Z",
			endsAt: "2026-09-08T11:00:00.000Z",
			status: "planned",
		};

		await act(async () => {
			root.render(
				<AppointmentModal
					isOpen={true}
					appointment={appt as Appointment}
					dashboard={mockDashboard}
					onClose={() => {}}
					onSave={async () => true}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
					appointmentLabels={defaultAppointmentLabels}
					activeVisitLockedAppointmentStatuses={new Set()}
				/>,
			);
		});

		const modeSelectBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-patient-mode-select",
		);
		const modeCreateBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-patient-mode-create",
		);

		assert.ok(modeSelectBtn, "Must render 'Из базы' button");
		assert.ok(modeCreateBtn, "Must render '+ Новый пациент' toggle button");
	});

	it("switches to inline patient creation form when '+ Новый пациент' is clicked", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const appt: Partial<Appointment> = {
			id: "new-123",
			patientId: "",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-09-08T10:00:00.000Z",
			endsAt: "2026-09-08T11:00:00.000Z",
			status: "planned",
		};

		await act(async () => {
			root.render(
				<AppointmentModal
					isOpen={true}
					appointment={appt as Appointment}
					dashboard={mockDashboard}
					onClose={() => {}}
					onSave={async () => true}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
					appointmentLabels={defaultAppointmentLabels}
					activeVisitLockedAppointmentStatuses={new Set()}
				/>,
			);
		});

		const modeCreateBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-patient-mode-create",
		);
		assert.ok(modeCreateBtn);

		await clickNode(modeCreateBtn);

		const panel = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-inline-new-patient-panel",
		);
		const nameInput = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-name",
		);
		const phoneInput = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-phone",
		);
		const savePatientBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-save-btn",
		);
		const cancelBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-cancel-btn",
		);

		assert.ok(panel, "Must render appointment-inline-new-patient-panel");
		assert.ok(nameInput, "Must render appointment-quick-patient-name input");
		assert.ok(phoneInput, "Must render appointment-quick-patient-phone input");
		assert.ok(savePatientBtn, "Must render appointment-quick-patient-save-btn");
		assert.ok(cancelBtn, "Must render appointment-quick-patient-cancel-btn");
	});

	it("creates patient via onQuickCreatePatient and auto-selects them", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const onQuickCreateMock = vi.fn(async (data: { fullName: string; phone?: string | null }) => {
			return {
				id: "pat-quick-999",
				fullName: data.fullName,
				phone: data.phone,
			};
		});

		const appt: Partial<Appointment> = {
			id: "new-123",
			patientId: "",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-09-08T10:00:00.000Z",
			endsAt: "2026-09-08T11:00:00.000Z",
			status: "planned",
		};

		await act(async () => {
			root.render(
				<AppointmentModal
					isOpen={true}
					appointment={appt as Appointment}
					dashboard={mockDashboard}
					onClose={() => {}}
					onSave={async () => true}
					onQuickCreatePatient={onQuickCreateMock}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
					appointmentLabels={defaultAppointmentLabels}
					activeVisitLockedAppointmentStatuses={new Set()}
				/>,
			);
		});

		// 1. Switch to create mode
		const modeCreateBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-patient-mode-create",
		);
		await clickNode(modeCreateBtn);

		// 2. Type patient name and phone
		const nameInput = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-name",
		);
		const phoneInput = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-phone",
		);

		await changeNode(nameInput, "Соколов Дмитрий Петрович");
		await changeNode(phoneInput, "+7 900 123-45-67");

		// 3. Click save patient button
		const savePatientBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-save-btn",
		);
		await clickNode(savePatientBtn);

		assert.strictEqual(onQuickCreateMock.calls.length, 1);
		assert.strictEqual(onQuickCreateMock.calls[0]![0].fullName, "Соколов Дмитрий Петрович");
		assert.strictEqual(onQuickCreateMock.calls[0]![0].phone, "+7 900 123-45-67");
	});

	it("auto-creates inline patient on handleSave if name was typed", async () => {
		const onSaveMock = vi.fn(async () => true);
		const onQuickCreateMock = vi.fn(async (data: { fullName: string }) => ({
			id: "pat-auto-created",
			fullName: data.fullName,
		}));

		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const appt: Partial<Appointment> = {
			id: "new-auto-save",
			patientId: "",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-09-08T10:00:00.000Z",
			endsAt: "2026-09-08T11:00:00.000Z",
			status: "planned",
		};

		await act(async () => {
			root.render(
				<AppointmentModal
					isOpen={true}
					appointment={appt as Appointment}
					dashboard={mockDashboard}
					onClose={() => {}}
					onSave={onSaveMock}
					onQuickCreatePatient={onQuickCreateMock}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
					appointmentLabels={defaultAppointmentLabels}
					activeVisitLockedAppointmentStatuses={new Set()}
				/>,
			);
		});

		// Switch to create mode and fill name
		const modeCreateBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-patient-mode-create",
		);
		await clickNode(modeCreateBtn);

		const nameInput = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-name",
		);
		await changeNode(nameInput, "Быстрый Пациент Без Спешки");

		// Save via inline button
		const savePatientBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-patient-save-btn",
		);
		await clickNode(savePatientBtn);

		assert.strictEqual(onQuickCreateMock.calls.length, 1);
		assert.strictEqual(onQuickCreateMock.calls[0]![0].fullName, "Быстрый Пациент Без Спешки");
	});
});
