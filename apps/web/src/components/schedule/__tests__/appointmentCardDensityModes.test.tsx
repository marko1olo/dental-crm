import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment, Dashboard, Patient } from "@dental/shared";
import { AppointmentCard } from "../AppointmentCard";

describe("AppointmentCard Adaptive Density Modes (15m, 30-45m, 60m+)", () => {
	const mockPatient: Patient = {
		id: "pat-1",
		organizationId: "org-1",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (999) 111-22-33",
		email: null,
		notes: null,
		birthDate: "1990-01-01",
		status: "active",
		balanceRub: 0,
		gender: null,
		administrativeProfile: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};

	const mockDashboard: any = {
		patients: [mockPatient],
		appointments: [],
		clinicSettings: {
			staff: [{ id: "doc-1", fullName: "Смирнов Алексей Викторович", role: "doctor", active: true }],
			chairs: [{ id: "chair-1", name: "Кресло 1", active: true }],
			profile: { mode: "standard", timezone: "Europe/Moscow" },
		},
	};

	const mockAppointmentLabels: Record<Appointment["status"], string> = {
		planned: "Запланирован",
		confirmed: "Подтвержден",
		arrived: "Прибыл",
		in_treatment: "В кресле",
		completed: "Завершен",
		cancelled: "Отменен",
		no_show: "Не явился",
	};

	function createProps(startsAt: string, endsAt: string, reason = "Осмотр") {
		const appointment: any = {
			id: "app-test",
			organizationId: "org-1",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			assistantUserId: null,
			startsAt,
			endsAt,
			status: "planned",
			reason,
			comment: "Проверка режима плотности",
		};

		return {
			appointment,
			dashboard: mockDashboard as Dashboard,
			visibleScheduleSuggestions: [],
			appointmentReadinessById: new Map(),
			appointmentLabels: mockAppointmentLabels,
			appointmentDraft: {},
			appointmentSaveState: "idle" as const,
			appointmentSaveError: null,
			appointmentDirty: false,
			appointmentEditing: false,
			appointmentHasOpenVisit: false,
			appointmentActiveVisitStatusLocked: false,
			appointmentMissingSteps: [],
			appointmentReadyToSave: true,
			openScheduleSuggestion: () => {},
			formatTime: (iso: string) => iso.slice(11, 16),
			patientName: () => "Иванов Иван Иванович",
			openAppointmentEditor: () => {},
			repeatAppointment: () => {},
			closeAppointmentEditor: () => {},
			updateAppointmentScheduleDraft: () => {},
			saveAppointmentSchedule: async () => true,
			normalizedAppointmentStatus: (v: any) => v,
			toDateTimeLocalValue: (v: string) => v,
			fromDateTimeLocalValue: (v: string) => v,
			useManualSelects: false,
			activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
		};
	}

	it("15-min slot (09:00 - 09:15): renders strictly 1-line micro-density mode without clipping or wrapping", () => {
		const props = createProps("2026-10-04T09:00:00.000Z", "2026-10-04T09:15:00.000Z", "Осмотр");
		const html = renderToStaticMarkup(React.createElement(AppointmentCard, props));

		assert.ok(html.includes('data-density="micro"'), "Должен быть data-density='micro'");
		assert.ok(html.includes('data-testid="appointment-card-micro-row"'), "Должен рендерить 1-строчный micro-row");
		assert.ok(html.includes("09:00"), "Должен содержать время 09:00");
		assert.ok(html.includes("Иванов Иван И."), "Должен содержать ФИО пациента Иванов Иван И.");
		assert.ok(html.includes("•"), "Должен содержать точку-разделитель");
		assert.ok(html.includes("Осмотр"), "Должен содержать процедуру Осмотр");
		assert.ok(html.includes("appointment-status-badge-selector"), "Должен содержать селектор статуса [✓]");
	});

	it("20-min slot (09:00 - 09:20): renders strictly 1-line micro-density mode", () => {
		const props = createProps("2026-10-04T09:00:00.000Z", "2026-10-04T09:20:00.000Z", "Снятие швов");
		const html = renderToStaticMarkup(React.createElement(AppointmentCard, props));

		assert.ok(html.includes('data-density="micro"'), "Должен быть data-density='micro'");
		assert.ok(html.includes('data-testid="appointment-card-micro-row"'), "Должен рендерить 1-строчный micro-row");
		assert.ok(html.includes("Снятие швов"), "Должен содержать процедуру Снятие швов");
	});

	it("30-min slot (09:00 - 09:30): renders 2-line mode with time, FIO and procedure + doctor", () => {
		const props = createProps("2026-10-04T09:00:00.000Z", "2026-10-04T09:30:00.000Z", "Лечение кариеса");
		const html = renderToStaticMarkup(React.createElement(AppointmentCard, props));

		assert.ok(html.includes('data-density="compact-2line"'), "Должен быть data-density='compact-2line'");
		assert.ok(html.includes('data-testid="appointment-card-two-line"'), "Должен рендерить two-line контейнер");
		assert.ok(html.includes("09:00"), "Должен содержать время начала");
		assert.ok(html.includes("09:30"), "Должен содержать время окончания");
		assert.ok(html.includes("Иванов Иван И."), "Должен содержать ФИО пациента");
		assert.ok(html.includes("Лечение кариеса"), "Должен содержать процедуру");
		assert.ok(html.includes("Смирнов А.В.") || html.includes("Смирнов Алексей Викторович"), "Должен содержать врача");
	});

	it("60-min slot (09:00 - 10:00): renders full expanded mode with prominent chips and sections", () => {
		const props = createProps("2026-10-04T09:00:00.000Z", "2026-10-04T10:00:00.000Z", "Эндодонтия зуба 36");
		const html = renderToStaticMarkup(React.createElement(AppointmentCard, props));

		assert.ok(html.includes('data-density="expanded"'), "Должен быть data-density='expanded'");
		assert.ok(html.includes('data-testid="appointment-card-expanded"'), "Должен рендерить expanded контейнер");
		assert.ok(html.includes("appointment-card-header"), "Должен содержать полный заголовок");
		assert.ok(html.includes("chip-reason"), "Должен содержать чип причины");
	});

	it("proportional heights strictly match duration formula (15m=38px, 20m=51px, 30m=76px, 60m=152px)", () => {
		const props15 = createProps("2026-10-04T09:00:00.000Z", "2026-10-04T09:15:00.000Z");
		const html15 = renderToStaticMarkup(React.createElement(AppointmentCard, props15));
		assert.ok(html15.includes('data-proportional-height="38"'), "15 мин должно быть 38px");
		assert.ok(html15.includes("min-height:38px") || html15.includes("min-height: 38px"), "15 мин minHeight = 38px");

		const props20 = createProps("2026-10-04T09:00:00.000Z", "2026-10-04T09:20:00.000Z");
		const html20 = renderToStaticMarkup(React.createElement(AppointmentCard, props20));
		assert.ok(html20.includes('data-proportional-height="51"'), "20 мин должно быть 51px");

		const props30 = createProps("2026-10-04T09:00:00.000Z", "2026-10-04T09:30:00.000Z");
		const html30 = renderToStaticMarkup(React.createElement(AppointmentCard, props30));
		assert.ok(html30.includes('data-proportional-height="76"'), "30 мин должно быть 76px (2x)");
		assert.ok(html30.includes("min-height:76px") || html30.includes("min-height: 76px"), "30 мин minHeight = 76px");

		const props60 = createProps("2026-10-04T09:00:00.000Z", "2026-10-04T10:00:00.000Z");
		const html60 = renderToStaticMarkup(React.createElement(AppointmentCard, props60));
		assert.ok(html60.includes('data-proportional-height="152"'), "60 мин должно быть 152px (4x)");
		assert.ok(html60.includes("min-height:152px") || html60.includes("min-height: 152px"), "60 мин minHeight = 152px");
	});

	it("densityMode override: 'compact' forces 1-line mode even on 60-min appointment", () => {
		const props = { ...createProps("2026-10-04T09:00:00.000Z", "2026-10-04T10:00:00.000Z"), densityMode: "compact" as const };
		const html = renderToStaticMarkup(React.createElement(AppointmentCard, props));
		assert.ok(html.includes('data-density="micro"'), "Должен форсировать micro density");
		assert.ok(html.includes('data-testid="appointment-card-micro-row"'), "Должен рендерить 1-строчный micro-row");
	});

	it("densityMode override: 'expanded' forces full block even on 15-min appointment", () => {
		const props = { ...createProps("2026-10-04T09:00:00.000Z", "2026-10-04T09:15:00.000Z"), densityMode: "expanded" as const };
		const html = renderToStaticMarkup(React.createElement(AppointmentCard, props));
		assert.ok(html.includes('data-density="expanded"'), "Должен форсировать expanded density");
		assert.ok(html.includes('data-testid="appointment-card-expanded"'), "Должен рендерить expanded контейнер");
	});
});
