/**
 * scheduleRedTeamInquisition.test.ts
 *
 * RED TEAM INQUISITOR DELTA: Schedule of Visits, Chair Grid & Operational Timeline
 * Ruthless verification of:
 * 1. Production Isolation (Mandates 8c, 8k, 8ae): Zero ghost appointments in production with empty DB.
 * 2. Hick's Law & Toolbar Density (Sin #2): Schedule toolbar is strictly 1 compact row (<= 36px).
 * 3. Miller's Law for Appointment Cards (Sin #3): At most 1-2 primary CTAs per card; secondary actions in "...".
 * 4. Zero Cartoon Emojis (Mandate 8d, Sin #7): Zero unicode emojis (⚡, 📅, 🦷, etc.) in status & CITO badges.
 * 5. Mobile HIG (Apple HIG <= 768px): Sovereign vertical Agenda, not squished 5-column grid.
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment, Dashboard, Patient } from "@dental/shared";

import { ScheduleDayZeroBanner } from "../components/schedule/grid/ScheduleGridToolbar";
import { ScheduleFilterStrip } from "../components/schedule/ScheduleFilterStrip";
import { AppointmentCardPrimaryActions } from "../components/schedule/AppointmentCardPrimaryActions";
import { AppointmentCard } from "../components/schedule/AppointmentCard";
import { AppointmentAlertBadges } from "../components/schedule/AppointmentPaymentBadges";
import { QuickBookingDrawer } from "../components/schedule/QuickBookingDrawer";
import { ScheduleMobileAgendaView } from "../components/schedule/mobile/ScheduleMobileAgendaView";

// Clean Production Mock Dashboard with Empty Appointments
const emptyProductionDashboard: Dashboard = {
	patients: [],
	appointments: [],
	medicalHistory: [],
	clinicSettings: {
		staff: [
			{ id: "doc-1", fullName: "Д-р Тестов", role: "doctor", active: true },
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет 1", active: true },
		],
		profile: {
			mode: "solo_doctor",
			timezone: "Europe/Samara",
		},
	},
	billing: {
		transactions: [],
		invoices: [],
	},
} as unknown as Dashboard;

const mockPatient: Patient = {
	id: "pat-100",
	organizationId: "org-1",
	fullName: "Смирнов Алексей Владимирович",
	phone: "+7 999 123-45-67",
	email: null,
	notes: null,
	birthDate: "1988-03-12",
	gender: "male",
	status: "active",
	balanceRub: 0,
	administrativeProfile: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const baseAppointment: Appointment = {
	id: "app-100",
	organizationId: "org-1",
	patientId: "pat-100",
	doctorUserId: "doc-1",
	chairId: "chair-1",
	startsAt: "2026-10-08T10:00:00.000Z",
	endsAt: "2026-10-08T10:30:00.000Z",
	status: "planned",
	reason: "Консультация",
	comment: "",
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

describe("Red Team Inquisitor Delta — Schedule & Chair Grid Inquisition", () => {
	describe("1. Production Isolation & Zero Ghost Appointments (Mandates 8c, 8k, 8ae)", () => {
		it("renders honest Day 0 empty state banner when appointments array is empty", () => {
			const html = renderToStaticMarkup(
				React.createElement(ScheduleDayZeroBanner, {
					dayAppointmentsCount: 0,
				})
			);

			assert.ok(
				html.includes("На выбранный день записей пока нет."),
				"Должен честно показывать отсутствие записей"
			);
			assert.ok(
				html.includes("Нажмите на любой свободный интервал в сетке ниже"),
				"Должен подсказывать клик по свободному интервалу"
			);
			assert.ok(
				!html.includes("Иванов И.И."),
				"Запрещено синтезировать фейковые записи 'Иванов И.И.'"
			);
		});

		it("does not render Day 0 banner when day has at least 1 appointment", () => {
			const html = renderToStaticMarkup(
				React.createElement(ScheduleDayZeroBanner, {
					dayAppointmentsCount: 1,
				})
			);

			assert.equal(html, "", "Баннер пустого дня должен скрываться при наличии записей");
		});
	});

	describe("2. Hick's Law & Single Compact Row Toolbar Density (Sin #2)", () => {
		it("renders schedule toolbar with strictly 1 row constraint (sm:h-9, sm:max-h-9) and 1 primary CTA", () => {
			const html = renderToStaticMarkup(
				React.createElement(ScheduleFilterStrip, {
					scheduleDateFilter: "2026-10-08",
					setScheduleDateFilter: () => {},
					stepScheduleDay: () => {},
					activeScheduleFilterCount: 0,
					resetScheduleFilters: () => {},
					staffMembers: emptyProductionDashboard.clinicSettings.staff as any,
					chairs: emptyProductionDashboard.clinicSettings.chairs as any,
					isSoloDoctor: false,
					todayIso: "2026-10-08",
					onQuickBooking: () => {},
				})
			);

			assert.ok(html.includes('data-testid="schedule-toolbar"'), "Должен присутствовать data-testid schedule-toolbar");
			assert.ok(html.includes("role=\"toolbar\""), "Должен иметь ARIA role='toolbar'");
			assert.ok(html.includes("sm:h-9"), "Высота тулбара должна быть ограничена 36px (sm:h-9)");
			assert.ok(html.includes("sm:max-h-9"), "Максимальная высота тулбара должна быть ограничена 36px (sm:max-h-9)");
			assert.ok(html.includes("flex-nowrap"), "Тулбар не должен переноситься на несколько строк (flex-nowrap)");

			// Strictly 1 Primary CTA button (+ Запись)
			assert.ok(html.includes("data-testid=\"schedule-toolbar-primary-quick-booking-btn\""), "Primary CTA должна иметь testid schedule-toolbar-primary-quick-booking-btn");
			assert.ok(html.includes("Запись"), "Должна присутствовать кнопка записи");

			// Secondary modes gathered in More options menu
			assert.ok(html.includes("data-testid=\"schedule-toolbar-options-btn\""), "Вторичные режимы должны быть в меню опций (MoreVertical)");
		});
	});

	describe("3. Miller's Law for Appointment Cards (Sin #3)", () => {
		it("renders at most 1-2 primary CTA action buttons across all appointment statuses", () => {
			const statuses: Array<Appointment["status"]> = ["planned", "confirmed", "arrived", "in_treatment", "completed"];

			for (const st of statuses) {
				const app = { ...baseAppointment, status: st };
				const html = renderToStaticMarkup(
					React.createElement(AppointmentCardPrimaryActions, {
						appointment: app,
						displayStatus: st,
						appointmentEditing: false,
						isQuickStatusUpdating: false,
						appointmentPatient: mockPatient,
						appointmentPatientName: mockPatient.fullName,
						handleQuickStatusChange: async () => {},
						handleShiftAppointmentTime: async () => {},
						repeatAppointment: () => {},
						openAppointmentEditor: () => {},
					})
				);

				if (html) {
					// Count <button tags in the primary actions container
					const buttonMatches = html.match(/<button/g) || [];
					assert.ok(
						buttonMatches.length <= 2,
						`Статус ${st} должен иметь не более 2 кнопок прямого действия (найдено: ${buttonMatches.length})`
					);
				}
			}
		});

		it("ensures secondary card actions are relegated to context menu button", () => {
			const activeVisitLockedStatuses = new Set<Appointment["status"]>();
			const html = renderToStaticMarkup(
				React.createElement(AppointmentCard, {
					appointment: baseAppointment,
					dashboard: {
						...emptyProductionDashboard,
						patients: [mockPatient],
						appointments: [baseAppointment],
					} as Dashboard,
					visibleScheduleSuggestions: [],
					appointmentReadinessById: new Map(),
					appointmentLabels: mockAppointmentLabels,
					appointmentDraft: {},
					appointmentSaveState: "idle",
					appointmentSaveError: null,
					appointmentDirty: false,
					appointmentEditing: false,
					appointmentHasOpenVisit: false,
					appointmentActiveVisitStatusLocked: false,
					appointmentMissingSteps: [],
					appointmentReadyToSave: true,
					openScheduleSuggestion: () => {},
					formatTime: () => "10:00",
					patientName: () => mockPatient.fullName,
					openAppointmentEditor: () => {},
					repeatAppointment: () => {},
					closeAppointmentEditor: () => {},
					updateAppointmentScheduleDraft: () => {},
					saveAppointmentSchedule: async () => true,
					normalizedAppointmentStatus: (v: any) => v,
					toDateTimeLocalValue: (v: string) => v,
					fromDateTimeLocalValue: (v: string) => v,
					useManualSelects: false,
					activeVisitLockedAppointmentStatuses: activeVisitLockedStatuses,
				})
			);

			assert.ok(
				html.includes("data-testid=\"appointment-context-menu-btn\""),
				"Карточка обязана содержать кнопку контекстного меню '...' для вторичных действий"
			);
		});
	});

	describe("4. Zero Cartoon Emojis (Mandate 8d, Sin #7)", () => {
		it("renders CITO acute pain badge with Lucide Zap SVG icon and zero unicode emojis", () => {
			const citoApp: Appointment = {
				...baseAppointment,
				reason: "Острая боль! CITO",
			};

			const activeVisitLockedStatuses = new Set<Appointment["status"]>();
			const html = renderToStaticMarkup(
				React.createElement(AppointmentCard, {
					appointment: citoApp,
					dashboard: {
						...emptyProductionDashboard,
						patients: [mockPatient],
						appointments: [citoApp],
					} as Dashboard,
					visibleScheduleSuggestions: [],
					appointmentReadinessById: new Map(),
					appointmentLabels: mockAppointmentLabels,
					appointmentDraft: {},
					appointmentSaveState: "idle",
					appointmentSaveError: null,
					appointmentDirty: false,
					appointmentEditing: false,
					appointmentHasOpenVisit: false,
					appointmentActiveVisitStatusLocked: false,
					appointmentMissingSteps: [],
					appointmentReadyToSave: true,
					openScheduleSuggestion: () => {},
					formatTime: () => "10:00",
					patientName: () => mockPatient.fullName,
					openAppointmentEditor: () => {},
					repeatAppointment: () => {},
					closeAppointmentEditor: () => {},
					updateAppointmentScheduleDraft: () => {},
					saveAppointmentSchedule: async () => true,
					normalizedAppointmentStatus: (v: any) => v,
					toDateTimeLocalValue: (v: string) => v,
					fromDateTimeLocalValue: (v: string) => v,
					useManualSelects: false,
					activeVisitLockedAppointmentStatuses: activeVisitLockedStatuses,
				})
			);

			assert.ok(html.includes("data-testid=\"appointment-cito-badge\""), "Должен присутствовать CITO бейдж");
			assert.ok(html.includes("СРОЧНО"), "Должен присутствовать четкий текст СРОЧНО");
			assert.ok(!html.includes("⚡"), "Запрещено использовать unicode эмодзи молнии ⚡");
			assert.ok(!html.includes("🦷"), "Запрещено использовать unicode эмодзи зуба 🦷");
			assert.ok(!html.includes("📅"), "Запрещено использовать unicode эмодзи календаря 📅");
		});

		it("renders QuickBookingDrawer in emergency mode with clean text and zero emojis", () => {
			const html = renderToStaticMarkup(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: {
						...emptyProductionDashboard,
						patients: [mockPatient],
					} as Dashboard,
					initialSlot: {
						dateKey: "2026-10-08",
						startTime: "11:00",
						durationMinutes: 30,
						isCitoEmergency: true,
					},
				})
			);

			assert.ok(html.includes("Срочная запись: острая боль"), "Заголовок должен содержать четкий текст без эмодзи");
			assert.ok(!html.includes("⚡"), "В заголовке и контролах не должно быть unicode молнии ⚡");
		});
	});

	describe("5. Mobile HIG (Apple HIG <= 768px Dedicated Agenda)", () => {
		it("renders dedicated vertical Agenda view on mobile without squishing chair columns", () => {
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileAgendaView, {
					dashboard: {
						...emptyProductionDashboard,
						patients: [mockPatient],
						appointments: [baseAppointment],
					} as Dashboard,
					dateKey: "2026-10-08",
					appointments: [baseAppointment],
					onDateChange: () => {},
					patientName: () => mockPatient.fullName,
					formatTime: () => "10:00",
					toDateTimeLocalValue: (iso) => iso,
					appointmentLabels: mockAppointmentLabels,
				})
			);

			// 1. Apple HIG Week Strip
			assert.ok(
				html.includes("schedule-mobile-day-strip"),
				"Мобильный вид обязан рендерить 7-дневную полосу недели в стиле Apple iOS Calendar"
			);

			// 2. Doctor and Chair horizontal chips
			assert.ok(
				html.includes("schedule-mobile-chips-wrapper"),
				"Мобильный вид обязан рендерить горизонтальный скроллер чипов врачей и кабинетов"
			);

			// 3. Dedicated agenda timeline item
			assert.ok(
				html.includes("schedule-mobile-agenda-list") || html.includes("schedule-mobile-agenda-item") || html.includes("schedule-mobile-agenda"),
				"Мобильный вид должен рендерить вертикальный список Agenda"
			);

			// 4. Zero multi-column table layout
			assert.ok(
				!html.includes("gridTemplateColumns: clamp(112px"),
				"Мобильный вид не должен использовать десктопную сетку кабинетов"
			);
		});
	});
});
