/**
 * soloDoctorScheduleAutonomyWave310.test.tsx
 *
 * Dedicated Test Suite for Mandates 8l / 8e / 8n / 8d / 8p:
 * Solo Doctor & Reception Ergonomics Inquisitor (Wave 310)
 *
 * SCOPE:
 * 1. 5-Second Booking Speed (Mandate 8n, 8e item 8):
 *    - Assistant is strictly optional with zero validation locks (solo doctor works alone)
 *    - Fast 1-click chair & patient selection defaults
 * 2. Toolbar Density per Hick's Law (Mandate 8d item 2, 8p):
 *    - Face toolbar ScheduleFilterStrip strictly 1 compact line (32-36px, h-9)
 *    - Face primary button [+ Запись] clearly visible, secondary actions in popover [...]
 *    - Solo doctor mode suppresses multiple doctor/chair chip clutter
 * 3. Visit Status Autonomy (Mandate 8e):
 *    - Status transition buttons («Пришел», «В кресле», «Завершен») are NEVER disabled
 * 4. CSS Invariants & Zero Emojis:
 *    - schedule.css enforces 36px 1-row density and WCAG AAA compliance without cartoon emojis
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";
import { ScheduleFilterStrip } from "../ScheduleFilterStrip";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../../../..");

const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const mockAppointmentLabels = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

const soloDoctorDashboard: Dashboard = {
	clinicSettings: {
		profile: {
			organizationId: "org-solo",
			clinicName: "Стоматолог ИП Соловьев",
			timezone: "Europe/Moscow",
			phone: "+7 900 123-45-67",
			address: "Москва, ул. Клиническая, 1",
			inn: "770123456789",
			mode: "solo_practice",
			updatedAt: "2026-09-24T00:00:00.000Z",
		},
		chairs: [
			{
				id: "chair-solo-1",
				name: "Кресло 1 (Основное)",
				specialization: "therapist",
				room: "1",
				active: true,
			},
		],
		staff: [
			{
				id: "doc-solo-1",
				organizationId: "org-solo",
				fullName: "Соловьев Алексей Васильевич",
				role: "doctor",
				active: true,
				specialties: ["therapist", "orthopedist"],
				color: "#0d9488",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		],
	},
	appointments: [],
	patients: [
		{
			id: "pat-1",
			fullName: "Иванов Иван Иванович",
			phone: "+7 999 111-22-33",
			birthDate: "1985-05-15",
			status: "active",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
	],
	inventory: [],
	treatmentPlans: [],
	invoices: [],
} as unknown as Dashboard;

const multiStaffDashboard: Dashboard = {
	clinicSettings: {
		profile: {
			organizationId: "org-multi",
			clinicName: "Стоматология ДЕНТЕ",
			timezone: "Europe/Moscow",
			mode: "clinic_standard",
		},
		chairs: [
			{ id: "chair-1", name: "Кресло 1", active: true },
			{ id: "chair-2", name: "Кресло 2", active: true },
		],
		staff: [
			{
				id: "doc-1",
				fullName: "Кузнецов Петр Сергеевич",
				role: "doctor",
				active: true,
			},
			{
				id: "doc-2",
				fullName: "Смирнова Елена Дмитриевна",
				role: "doctor",
				active: true,
			},
			{
				id: "asst-1",
				fullName: "Сидорова Анна Николаевна",
				role: "assistant",
				active: true,
			},
		],
	},
	appointments: [],
	patients: [
		{
			id: "pat-1",
			fullName: "Иванов Иван Иванович",
			phone: "+7 999 111-22-33",
			status: "active",
		},
	],
} as unknown as Dashboard;

describe("Mandates 8l / 8e / 8n / 8d / 8p: Solo Doctor & Reception Ergonomics Inquisitor", () => {
	describe("1. 5-Second Booking Speed & Optional Assistant (Mandates 8n, 8e item 8)", () => {
		it("QuickBookingDrawer does not require assistant in solo doctor mode", () => {
			const html = renderToString(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: soloDoctorDashboard,
					initialSlot: {
						dateKey: "2026-09-24",
						startTime: "10:00",
					},
				}),
			);

			// In solo doctor mode, assistant selector is completely hidden (solo doctor works alone)
			assert.ok(
				!html.includes("data-testid=\"select-booking-assistant\""),
				"Assistant selector must not be rendered in solo doctor mode",
			);
			assert.ok(
				html.includes("data-testid=\"quick-booking-drawer\""),
				"Quick booking drawer must be open and rendered",
			);
		});

		it("QuickBookingDrawer provides optional assistant with empty fallback in multi-staff mode", () => {
			const html = renderToString(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: multiStaffDashboard,
					initialSlot: {
						dateKey: "2026-09-24",
						startTime: "10:00",
					},
				}),
			);

			// In multi-staff mode, assistant selector is rendered with optional default
			assert.ok(
				html.includes("data-testid=\"select-booking-assistant\""),
				"Assistant selector must be rendered when assistants exist",
			);
			assert.ok(
				html.includes("-- Без ассистента (соло-приём) --"),
				"Assistant selector must have explicit optional fallback option",
			);
			assert.ok(
				html.includes("Выбор ассистента строго опционален и не блокирует запись"),
				"Helper text must confirm assistant is optional per Mandates 8e, 8n",
			);
		});

		it("AppointmentModal hides assistant for solo doctor and makes it optional for multi-staff", () => {
			const sampleAppt: Appointment = {
				id: "appt-100",
				patientId: "pat-1",
				doctorUserId: "doc-solo-1",
				chairId: "chair-solo-1",
				startsAt: "2026-09-24T10:00:00.000Z",
				endsAt: "2026-09-24T10:30:00.000Z",
				status: "planned",
				reason: "Осмотр",
			} as Appointment;

			// Solo doctor mode
			const soloHtml = renderToString(
				React.createElement(AppointmentModal, {
					isOpen: true,
					appointment: sampleAppt,
					dashboard: soloDoctorDashboard,
					onClose: () => {},
					onSave: async () => true,
					patientName: () => "Иванов И.И.",
					formatTime: (iso) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso) => iso.slice(0, 16),
					fromDateTimeLocalValue: (val) => `${val}:00.000Z`,
					appointmentLabels: mockAppointmentLabels,
					activeVisitLockedAppointmentStatuses: new Set(),
				}),
			);

			assert.ok(
				!soloHtml.includes("data-testid=\"select-appointment-assistant\""),
				"AppointmentModal must hide assistant selector in solo doctor mode",
			);

			// Multi-staff mode
			const multiHtml = renderToString(
				React.createElement(AppointmentModal, {
					isOpen: true,
					appointment: { ...sampleAppt, doctorUserId: "doc-1", chairId: "chair-1" },
					dashboard: multiStaffDashboard,
					onClose: () => {},
					onSave: async () => true,
					patientName: () => "Иванов И.И.",
					formatTime: (iso) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso) => iso.slice(0, 16),
					fromDateTimeLocalValue: (val) => `${val}:00.000Z`,
					appointmentLabels: mockAppointmentLabels,
					activeVisitLockedAppointmentStatuses: new Set(),
				}),
			);

			assert.ok(
				multiHtml.includes("data-testid=\"select-appointment-assistant\""),
				"AppointmentModal must render assistant selector when assistants exist",
			);
			assert.ok(
				multiHtml.includes("-- Без ассистента (соло-приём) --"),
				"AppointmentModal must provide optional assistant fallback",
			);
		});

		it("QuickBookingDrawer provides 1-click express CITO patient button", () => {
			const html = renderToString(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: soloDoctorDashboard,
				}),
			);

			assert.ok(
				html.includes("data-testid=\"quick-booking-cito-express-btn\""),
				"Quick booking drawer must offer 1-click express CITO patient creation",
			);
		});
	});

	describe("2. Toolbar Density per Hick's Law (Mandate 8d item 2, 8p)", () => {
		it("ScheduleFilterStrip renders strictly 1 row with 32-36px desktop height", () => {
			const html = renderToString(
				React.createElement(ScheduleFilterStrip, {
					scheduleDateFilter: "2026-09-24",
					setScheduleDateFilter: () => {},
					stepScheduleDay: () => {},
					activeScheduleFilterCount: 0,
					resetScheduleFilters: () => {},
					onQuickBooking: () => {},
					isSoloDoctor: true,
				}),
			);

			assert.ok(
				html.includes("data-testid=\"schedule-toolbar\""),
				"Schedule toolbar must be rendered with proper data-testid",
			);
			assert.ok(
				html.includes("sm:min-h-[36px] sm:h-9 sm:max-h-9"),
				"Schedule toolbar must enforce strictly 36px height (h-9) on desktop",
			);
			assert.ok(
				html.includes("flex-nowrap"),
				"Schedule toolbar must never wrap into multiple rows",
			);
		});

		it("ScheduleFilterStrip displays prominent [+ Запись] button on face toolbar", () => {
			const html = renderToString(
				React.createElement(ScheduleFilterStrip, {
					scheduleDateFilter: "2026-09-24",
					setScheduleDateFilter: () => {},
					stepScheduleDay: () => {},
					activeScheduleFilterCount: 0,
					resetScheduleFilters: () => {},
					onQuickBooking: () => {},
					isSoloDoctor: true,
				}),
			);

			assert.ok(
				html.includes("data-testid=\"schedule-toolbar-primary-quick-booking-btn\""),
				"Primary [+ Запись] button must be present on face toolbar",
			);
			assert.ok(
				html.includes("schedule-toolbar-primary-quick-booking-btn"),
				"Primary quick booking button must have dedicated CSS class",
			);
		});

		it("ScheduleFilterStrip suppresses multiple doctor and chair chip clutter for solo doctor", () => {
			const html = renderToString(
				React.createElement(ScheduleFilterStrip, {
					scheduleDateFilter: "2026-09-24",
					setScheduleDateFilter: () => {},
					stepScheduleDay: () => {},
					activeScheduleFilterCount: 0,
					resetScheduleFilters: () => {},
					onQuickBooking: () => {},
					isSoloDoctor: true,
					staffMembers: [
						{ id: "doc-solo-1", fullName: "Соловьев А.В.", role: "doctor", active: true },
					],
					chairs: [
						{ id: "chair-solo-1", name: "Кресло 1", active: true },
					],
					scheduleDoctorFilterId: null,
					setScheduleDoctorFilterId: () => {},
					scheduleChairFilterId: null,
					setScheduleChairFilterId: () => {},
				}),
			);

			// Solo doctor: no repetitive chair chips or doctor chips cluttering the 1-row toolbar
			assert.ok(
				!html.includes("schedule-doctor-chip"),
				"Solo doctor toolbar must not render redundant single doctor chip",
			);
			assert.ok(
				!html.includes("data-testid=\"schedule-add-chair-btn\""),
				"Solo doctor toolbar must not clutter hot path with + Кресло button",
			);
		});

		it("ScheduleFilterStrip provides secondary actions inside the [...] options dropdown", () => {
			const html = renderToString(
				React.createElement(ScheduleFilterStrip, {
					scheduleDateFilter: "2026-09-24",
					setScheduleDateFilter: () => {},
					stepScheduleDay: () => {},
					activeScheduleFilterCount: 0,
					resetScheduleFilters: () => {},
					onQuickBooking: () => {},
					isSoloDoctor: true,
					onToggleShiftAnalytics: () => {},
					onOpenShiftRoster: () => {},
					onOpenCalendarSync: () => {},
				}),
			);

			assert.ok(
				html.includes("data-testid=\"schedule-toolbar-options-btn\""),
				"Options dropdown button [...] must be present",
			);
			assert.ok(
				html.includes("schedule-options-dropdown"),
				"Options dropdown container must exist for secondary actions",
			);
			assert.ok(
				html.includes("data-testid=\"schedule-options-quick-booking-btn\""),
				"Quick booking must also be accessible inside options dropdown for compact viewports",
			);
		});
	});

	describe("3. Visit Status Autonomy (Mandate 8e)", () => {
		it("QuickBookingDrawer visit status buttons are NEVER disabled", () => {
			const html = renderToString(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: soloDoctorDashboard,
				}),
			);

			const statusTestIds = [
				"quick-status-btn-planned",
				"quick-status-btn-confirmed",
				"quick-status-btn-arrived",
				"quick-status-btn-in_treatment",
				"quick-status-btn-completed",
				"quick-status-btn-no_show",
			];

			for (const testId of statusTestIds) {
				assert.ok(
					html.includes(`data-testid="${testId}"`),
					`Status button ${testId} must be rendered in QuickBookingDrawer`,
				);
				// Verify button is not disabled
				const btnIdx = html.indexOf(`data-testid="${testId}"`);
				const btnChunk = html.slice(Math.max(0, btnIdx - 150), btnIdx + 150);
				assert.ok(
					!btnChunk.includes("disabled"),
					`Status button ${testId} must NEVER be disabled in QuickBookingDrawer`,
				);
			}
		});

		it("AppointmentModal visit status buttons are NEVER disabled even with open visit", () => {
			const sampleAppt: Appointment = {
				id: "appt-active",
				patientId: "pat-1",
				doctorUserId: "doc-solo-1",
				chairId: "chair-solo-1",
				startsAt: "2026-09-24T10:00:00.000Z",
				endsAt: "2026-09-24T10:30:00.000Z",
				status: "in_treatment",
				reason: "Лечение кариеса",
			} as Appointment;

			const html = renderToString(
				React.createElement(AppointmentModal, {
					isOpen: true,
					appointment: sampleAppt,
					dashboard: {
						...soloDoctorDashboard,
						activeVisit: {
							id: "visit-1",
							appointmentId: "appt-active",
							patientId: "pat-1",
							doctorId: "doc-solo-1",
							startedAt: "2026-09-24T10:00:00.000Z",
						},
					} as any,
					onClose: () => {},
					onSave: async () => true,
					patientName: () => "Иванов И.И.",
					formatTime: (iso) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso) => iso.slice(0, 16),
					fromDateTimeLocalValue: (val) => `${val}:00.000Z`,
					appointmentLabels: mockAppointmentLabels,
					activeVisitLockedAppointmentStatuses: new Set(),
				}),
			);

			const statusTestIds = [
				"modal-status-btn-planned",
				"modal-status-btn-confirmed",
				"modal-status-btn-arrived",
				"modal-status-btn-in_treatment",
				"modal-status-btn-completed",
				"modal-status-btn-no_show",
			];

			for (const testId of statusTestIds) {
				assert.ok(
					html.includes(`data-testid="${testId}"`),
					`Status button ${testId} must be rendered in AppointmentModal`,
				);
				const btnIdx = html.indexOf(`data-testid="${testId}"`);
				const btnChunk = html.slice(Math.max(0, btnIdx - 150), btnIdx + 150);
				assert.ok(
					!btnChunk.includes("disabled"),
					`Status button ${testId} must NEVER be disabled in AppointmentModal`,
				);
			}
		});
	});

	describe("4. CSS Invariants, Strict UTF-8 and Zero Emojis", () => {
		it("schedule.css exists and enforces 36px toolbar density and status autonomy", () => {
			const cssPath = path.join(webRoot, "src/components/schedule/schedule.css");
			assert.ok(fs.existsSync(cssPath), "apps/web/src/components/schedule/schedule.css must exist");

			const cssContent = fs.readFileSync(cssPath, "utf8");
			assert.ok(
				cssContent.includes(".schedule-filter-strip"),
				"schedule.css must style .schedule-filter-strip",
			);
			assert.ok(
				cssContent.includes("height: 36px"),
				"schedule.css must enforce height: 36px",
			);
			assert.ok(
				cssContent.includes(".schedule-toolbar-primary-quick-booking-btn"),
				"schedule.css must style .schedule-toolbar-primary-quick-booking-btn",
			);
			assert.ok(
				cssContent.includes("pointer-events: auto !important"),
				"schedule.css must guarantee status buttons are never disabled",
			);
		});

		it("schedule.css and components contain zero cartoon emojis (Mandate 8d item 7)", () => {
			const cssPath = path.join(webRoot, "src/components/schedule/schedule.css");
			const cssContent = fs.readFileSync(cssPath, "utf8");
			assert.ok(
				!CARTOON_EMOJI_REGEX.test(cssContent),
				"schedule.css must contain zero cartoon emojis",
			);

			const filterStripPath = path.join(webRoot, "src/components/schedule/ScheduleFilterStrip.tsx");
			const filterStripContent = fs.readFileSync(filterStripPath, "utf8");
			assert.ok(
				!CARTOON_EMOJI_REGEX.test(filterStripContent),
				"ScheduleFilterStrip.tsx must contain zero cartoon emojis",
			);

			const quickDrawerPath = path.join(webRoot, "src/components/schedule/QuickBookingDrawer.tsx");
			const quickDrawerContent = fs.readFileSync(quickDrawerPath, "utf8");
			assert.ok(
				!CARTOON_EMOJI_REGEX.test(quickDrawerContent),
				"QuickBookingDrawer.tsx must contain zero cartoon emojis",
			);

			const modalPath = path.join(webRoot, "src/components/schedule/AppointmentModal.tsx");
			const modalContent = fs.readFileSync(modalPath, "utf8");
			assert.ok(
				!CARTOON_EMOJI_REGEX.test(modalContent),
				"AppointmentModal.tsx must contain zero cartoon emojis",
			);
		});
	});
});
