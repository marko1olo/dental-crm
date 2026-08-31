import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";
import { ScheduleTimeline } from "./ScheduleTimeline";
import type { ScheduleDayGroup } from "./scheduleDayGrouping";

const mockAppointment: Appointment = {
	id: "appt-1",
	organizationId: "org-1",
	patientId: "pat-1",
	doctorUserId: "doc-1",
	assistantUserId: "ast-1",
	chairId: "chair-1",
	startsAt: "2026-08-21T10:00:00.000Z",
	endsAt: "2026-08-21T11:00:00.000Z",
	status: "confirmed",
	reason: null,
	comment: null,
};

// biome-ignore lint/suspicious/noExplicitAny: mock
const mockDashboard: any = {
	patients: [{ id: "pat-1", fullName: "Иванов Иван", phone: "+79991112233" }],
	appointments: [mockAppointment],
	clinicSettings: {
		staff: [{ id: "doc-1", fullName: "Д-р Смирнов", role: "doctor", active: true }],
		chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
		profile: { mode: "solo_doctor", timezone: "Europe/Samara" },
	},
};

const mockDayGroups: ScheduleDayGroup[] = [
	{
		dateKey: "2026-08-21",
		title: "21 августа 2026 г., пятница",
		relativeLabel: "сегодня",
		relation: "today",
		appointmentCount: 1,
		bookedMinutes: 60,
		freeGapMinutes: 60,
		overlapCount: 0,
		rows: [
			{
				kind: "appointment",
				appointment: {
					id: mockAppointment.id,
					startsAt: mockAppointment.startsAt,
					endsAt: mockAppointment.endsAt,
					status: mockAppointment.status,
					doctorUserId: mockAppointment.doctorUserId,
					chairId: mockAppointment.chairId,
					patientId: mockAppointment.patientId,
					assistantUserId: mockAppointment.assistantUserId ?? null,
				},
			},
			{
				kind: "gap",
				minutes: 60,
				afterAppointmentId: "appt-1",
				startsAt: "2026-08-21T11:00:00.000Z",
				endsAt: "2026-08-21T12:00:00.000Z",
			},
		],
	},
];

describe("ScheduleTimeline", () => {
	it("renders empty state when visibleDayGroups is empty and appointments is empty", () => {
		const html = renderToStaticMarkup(
			React.createElement(ScheduleTimeline, {
				visibleDayGroups: [],
				dashboard: { ...mockDashboard, appointments: [] } as Dashboard,
				visibleScheduleSuggestions: [],
				appointmentReadinessById: new Map(),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
				appointmentScheduleDrafts: {},
				appointmentScheduleSaveStates: {},
				appointmentScheduleErrors: {},
				appointmentScheduleDirtyIds: new Set<string>(),
				editingAppointmentId: null,
				appointmentDraftFromAppointment: () => ({}),
				appointmentDraftMissingSteps: () => [],
				activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
				openScheduleSuggestion: () => {},
				formatTime: (v) => v.slice(11, 16),
				patientName: () => "Иванов Иван",
				openAppointmentEditor: () => {},
				repeatAppointment: () => {},
				closeAppointmentEditor: () => {},
				updateAppointmentScheduleDraft: () => {},
				saveAppointmentSchedule: async () => true,
				normalizedAppointmentStatus: (v) => (v as Appointment["status"]) || "planned",
				toDateTimeLocalValue: () => "",
				fromDateTimeLocalValue: () => "",
				useManualSelects: false,
				stepScheduleDay: () => {},
			}),
		);

		assert.ok(html.includes("Записей пока нет ни одной"), "должен быть заголовок пустого состояния");
	});

	it("renders day group title, appointment cards and interactive gap slots", () => {
		const html = renderToStaticMarkup(
			React.createElement(ScheduleTimeline, {
				visibleDayGroups: mockDayGroups,
				dashboard: mockDashboard as Dashboard,
				visibleScheduleSuggestions: [],
				appointmentReadinessById: new Map(),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
				appointmentScheduleDrafts: {},
				appointmentScheduleSaveStates: {},
				appointmentScheduleErrors: {},
				appointmentScheduleDirtyIds: new Set<string>(),
				editingAppointmentId: null,
				appointmentDraftFromAppointment: () => ({}),
				appointmentDraftMissingSteps: () => [],
				activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
				openScheduleSuggestion: () => {},
				formatTime: (v) => v.slice(11, 16),
				patientName: () => "Иванов Иван",
				openAppointmentEditor: () => {},
				repeatAppointment: () => {},
				closeAppointmentEditor: () => {},
				updateAppointmentScheduleDraft: () => {},
				saveAppointmentSchedule: async () => true,
				normalizedAppointmentStatus: (v) => (v as Appointment["status"]) || "planned",
				toDateTimeLocalValue: () => "",
				fromDateTimeLocalValue: () => "",
				useManualSelects: false,
				stepScheduleDay: () => {},
			}),
		);

		assert.ok(html.includes("21 августа 2026 г., пятница"), "должен быть заголовок дня");
		assert.ok(html.includes("Иванов Иван"), "должно быть ФИО пациента в карточке");
		assert.ok(html.includes("data-testid=\"appointment-card\""), "должна быть карточка записи");
		assert.ok(html.includes("Свободно"), "должен быть блок свободного окна");
		assert.ok(html.includes("data-timeline-focusable=\"true\""), "элементы таймлайна должны иметь data-timeline-focusable=true для навигации стрелками");
		assert.ok(html.includes("min-h-[44px]"), "свободные окна должны иметь min-h-[44px] touch target");
		assert.ok(html.includes("pb-36"), "контейнер таймлайна должен иметь безопасный мобильный отступ pb-36 (144px)");
		assert.ok(html.includes("scroll-padding-bottom: 144px") || html.includes("scrollPaddingBottom") || html.includes("144px"), "контейнер должен иметь scroll-padding-bottom 144px");
	});
});
