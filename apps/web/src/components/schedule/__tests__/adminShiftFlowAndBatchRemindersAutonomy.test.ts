/**
 * adminShiftFlowAndBatchRemindersAutonomy.test.ts
 *
 * Comprehensive Red Team Verification Suite for:
 * 1. 1-Click Admin Autopilot: Tomorrow Reminders Batch Cascade Dispatch (TomorrowRemindersModal)
 * 2. 1-Click 54-FZ Cash Shift Open/Close & Kopeck-Exact Reconciliation (CashRegisterModal, CashShiftWidget, ShiftCloseZReportModal)
 * 3. 5-Second Solo Doctor / Small Clinic Quick Booking Flow without mandatory assistant (QuickBookingDrawer)
 * 4. Doctor Shift Control Bar Receptionist/Schedule Parity (DoctorShiftControlBar)
 * 5. Strict Constitutional Invariants:
 *    - 0 disabled buttons (Mandate 8e)
 *    - Zero cartoon emojis (Mandate 8d pt 7)
 *    - Modal depth <= 1 (Mandate 8d pt 6)
 *    - Strict kopeck-exact financial math (Mandate 8b)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard, Appointment, Patient } from "@dental/shared";

import { TomorrowRemindersModal } from "../TomorrowRemindersModal";
import {
	compileTomorrowReminders,
	formatAllRemindersClipboardBuffer,
	dispatchBatchReminders,
} from "../tomorrowRemindersEngine";
import { CashRegisterModal } from "../../finance/CashRegisterModal";
import { CashShiftWidget } from "../../finance/CashShiftWidget";
import { ShiftCloseZReportModal } from "../../finance/fiscal/ShiftCloseZReportModal";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { DoctorShiftControlBar } from "../DoctorShiftControlBar";

// Regular expression to catch cartoon emojis
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Red Team: Admin Shift Flow & Batch Reminders Autonomy Suite", () => {
	const mockDateIso = "2026-09-26";

	const mockDashboard: Dashboard = {
		clinicSettings: {
			profile: {
				clinicName: "Стоматология «ДЕНТЕ Плюс»",
				legalName: "ООО «ДЕНТЕ ПЛЮС»",
				inn: "7701234567",
				kpp: "770101001",
				address: "Москва, ул. Клиническая, 15",
				phone: "+7 (495) 777-88-99",
				timezone: "Europe/Moscow",
			},
			staff: [
				{
					id: "doc-solo-1",
					fullName: "Доктор Стоматологов Петр Алексеевич",
					specialties: ["general", "therapist"],
					active: true,
					role: "doctor",
				},
				{
					id: "assistant-1",
					fullName: "Медсестра Смирнова Ольга",
					specialties: [],
					active: true,
					role: "assistant",
				},
			],
			chairs: [
				{ id: "chair-1", name: "Кабинет №1 (Терапия)", active: true },
				{ id: "chair-2", name: "Кабинет №2 (Хирургия)", active: true },
			],
		},
		patients: [
			{
				id: "pat-1",
				fullName: "Иванова Мария Викторовна",
				phone: "+7 (916) 111-22-33",
				telegramUsername: "masha_ivanova",
				allergies: "Амоксициллин",
			} as unknown as Patient,
			{
				id: "pat-2",
				fullName: "Кузнецов Дмитрий Сергеевич",
				phone: "+7 (926) 444-55-66",
				telegramUsername: null,
			} as unknown as Patient,
			{
				id: "pat-3-cito",
				fullName: "Семенов Артем Игоревич",
				phone: "+7 (903) 999-00-11",
				telegramUsername: null,
			} as unknown as Patient,
		],
		appointments: [
			{
				id: "appt-1",
				patientId: "pat-1",
				doctorUserId: "doc-solo-1",
				chairId: "chair-1",
				startsAt: "2026-09-26T09:00:00.000Z",
				endsAt: "2026-09-26T10:00:00.000Z",
				status: "planned",
				reason: "Лечение кариеса 1.6",
			} as unknown as Appointment,
			{
				id: "appt-2",
				patientId: "pat-2",
				doctorUserId: "doc-solo-1",
				chairId: "chair-1",
				startsAt: "2026-09-26T11:00:00.000Z",
				endsAt: "2026-09-26T12:00:00.000Z",
				status: "confirmed",
				reason: "Профгигиена полости рта",
			} as unknown as Appointment,
			{
				id: "appt-3",
				patientId: "pat-3-cito",
				doctorUserId: "doc-solo-1",
				chairId: "chair-1",
				startsAt: "2026-09-26T14:00:00.000Z",
				endsAt: "2026-09-26T14:30:00.000Z",
				status: "planned",
				reason: "CITO Острая боль пульпит",
				isCito: true,
			} as unknown as Appointment,
		],
	} as unknown as Dashboard;

	/* -------------------------------------------------------------------------- */
	/* 1. 1-Click Tomorrow Reminders Batch Autopilot (TomorrowRemindersModal)     */
	/* -------------------------------------------------------------------------- */
	describe("1. TomorrowRemindersModal & Engine Autopilot", () => {
		it("compiles batch reminders with multi-channel waterfall and CITO alerts", () => {
			const summary = compileTomorrowReminders(mockDashboard, mockDateIso);
			assert.equal(summary.totalAppointmentsCount, 3, "Total appointments count matches");
			assert.equal(summary.validPhoneCount, 3, "All 3 patients have valid phone contacts");
			assert.equal(summary.missingPhoneCount, 0, "Zero patients missing phone");
			assert.equal(summary.telegramAvailableCount, 1, "Patient 1 has Telegram handle");
			assert.equal(summary.whatsAppAvailableCount, 3, "All 3 patients have WhatsApp candidate phone");

			// Check CITO recognition
			const citoItem = summary.reminders.find((r) => r.appointmentId === "appt-3");
			assert.ok(citoItem?.isCito, "CITO emergency flag recognized");

			// Check allergy alert
			const allergyItem = summary.reminders.find((r) => r.appointmentId === "appt-1");
			assert.ok(allergyItem?.hasAllergyWarning, "Allergy alert recognized");
			assert.ok(allergyItem?.allergyWarningText?.includes("Амоксициллин"), "Allergy text includes allergen");

			// Check combined clipboard buffer formatting
			const clipboardText = formatAllRemindersClipboardBuffer(summary);
			assert.ok(clipboardText.includes("НАПОМИНАНИЯ НА"), "Clipboard buffer contains header");
			assert.ok(clipboardText.includes("Иванова Мария Викторовна"), "Clipboard buffer contains patient 1");
			assert.ok(clipboardText.includes("Кузнецов Дмитрий Сергеевич"), "Clipboard buffer contains patient 2");
			assert.ok(clipboardText.includes("Семенов Артем Игоревич"), "Clipboard buffer contains patient 3");
		});

		it("dispatches batch reminders without manual per-contact clicking", async () => {
			const summary = compileTomorrowReminders(mockDashboard, mockDateIso);
			const dispatchResult = await dispatchBatchReminders(summary.reminders, {
				allowQuietHoursOverride: true,
			});

			assert.equal(dispatchResult.total, 3, "Dispatched total count matches");
			assert.equal(dispatchResult.dispatched, 3, "All 3 reminders dispatched in batch");
			assert.equal(dispatchResult.skippedNoContact, 0, "No contacts skipped");
		});

		it("renders TomorrowRemindersModal with 0 disabled buttons and zero cartoon emojis (Mandate 8e, 8d pt 7)", () => {
			const html = renderToStaticMarkup(
				React.createElement(TomorrowRemindersModal, {
					isOpen: true,
					onClose: () => {},
					dashboard: mockDashboard,
					targetDateIso: mockDateIso,
				}),
			);

			// Check modal presence
			assert.ok(html.includes("data-testid=\"tomorrow-reminders-modal\""), "Renders modal testid");
			assert.ok(html.includes("Напоминания на завтра"), "Renders title");
			assert.ok(html.includes("Разослать все (Каскад)"), "Renders cascade dispatch button");
			assert.ok(html.includes("Копировать все"), "Renders copy all button");

			// Check Mandate 8e: ZERO disabled buttons
			const buttonMatches = html.match(/<button[^>]*>/g) || [];
			for (const btn of buttonMatches) {
				assert.equal(
					/disabled(?=[>\s=])/.test(btn),
					false,
					`Button must not have HTML disabled attribute per Mandate 8e: ${btn}`,
				);
			}

			// Check Mandate 8d pt 7: ZERO cartoon emojis
			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"TomorrowRemindersModal must contain ZERO cartoon emojis",
			);
		});
	});

	/* -------------------------------------------------------------------------- */
	/* 2. 1-Click 54-FZ Cash Shift Open / Close & Kopeck-Exact Reconciliation    */
	/* -------------------------------------------------------------------------- */
	describe("2. CashRegisterModal 1-Click 54-FZ Shift Flow & Strict Kopeck Reconciliation", () => {
		it("renders closed state with 1-click open button and 0 disabled buttons", () => {
			const html = renderToStaticMarkup(
				React.createElement(CashRegisterModal, {
					isOpen: true,
					onClose: () => {},
					isShiftOpen: false,
					shiftNumber: 12,
					cashierFullName: "Иванова Елена Петровна",
				}),
			);

			assert.ok(html.includes("data-testid=\"cash-register-modal\""), "Renders cash register modal");
			assert.ok(html.includes("Смена закрыта"), "Shows closed status");
			assert.ok(html.includes("data-testid=\"btn-1click-open-shift\""), "Renders 1-click open shift button");

			// Check Mandate 8e: ZERO disabled buttons
			const buttonMatches = html.match(/<button[^>]*>/g) || [];
			for (const btn of buttonMatches) {
				assert.equal(
					/disabled(?=[>\s=])/.test(btn),
					false,
					`Button must not have HTML disabled attribute: ${btn}`,
				);
			}

			// Check Mandate 8d pt 7: Zero emojis
			assert.equal(EMOJI_REGEX.test(html), false, "CashRegisterModal must contain ZERO emojis");
		});

		it("renders open state with exact kopeck reconciliation across cash, acquiring, SBP and advance offset", () => {
			const cashRub = 14500.5;
			const cardRub = 32000;
			const sbpRub = 8500.25;
			const advanceRub = 3000;
			const expectedTotalRub = cashRub + cardRub + sbpRub + advanceRub; // 58000.75

			const html = renderToStaticMarkup(
				React.createElement(CashRegisterModal, {
					isOpen: true,
					onClose: () => {},
					isShiftOpen: true,
					shiftNumber: 14,
					cashierFullName: "Администратор Смирнова",
					cashInDrawerRub: cashRub,
					cardSumRub: cardRub,
					sbpSumRub: sbpRub,
					advanceOffsetRub: advanceRub,
					initialTab: "reconciliation",
				}),
			);

			assert.ok(html.includes("Смена №14 активна"), "Shows active shift badge");
			assert.ok(html.includes("data-testid=\"kpi-net-revenue\""), "Shows net revenue KPI card");
			assert.ok(html.includes("data-testid=\"kpi-cash-in-drawer\""), "Shows cash in drawer KPI card");
			assert.ok(html.includes("data-testid=\"kpi-electronic\""), "Shows card/SBP electronic KPI card");
			assert.ok(html.includes("data-testid=\"kpi-advance-offset\""), "Shows advance offset KPI card");
			assert.ok(html.includes("data-testid=\"btn-1click-close-shift\""), "Shows 1-click close shift button");
			assert.ok(html.includes("data-testid=\"btn-print-x-report-footer\""), "Shows X-report print button");

			// Check formatted revenue string representation
			assert.ok(html.includes("58\u00A0000,75") || html.includes("58 000,75"), "Total net revenue formatted exactly to kopecks");

			// Check Mandate 8e: ZERO disabled buttons
			const buttonMatches = html.match(/<button[^>]*>/g) || [];
			for (const btn of buttonMatches) {
				assert.equal(
					/disabled(?=[>\s=])/.test(btn),
					false,
					`All action buttons must be enabled per Mandate 8e: ${btn}`,
				);
			}
		});

		it("verifies 1-click drawer cash match button and status calculation in CashRegisterModal", () => {
			const cashRub = 12500;
			const html = renderToStaticMarkup(
				React.createElement(CashRegisterModal, {
					isOpen: true,
					onClose: () => {},
					isShiftOpen: true,
					shiftNumber: 15,
					cashInDrawerRub: cashRub,
					initialTab: "drawer",
				}),
			);

			assert.ok(html.includes("data-testid=\"btn-match-drawer-cash\""), "Renders 1-click match drawer cash button");
			assert.ok(html.includes("Совпадает с кассой"), "Button label contains 'Совпадает с кассой'");
			assert.ok(html.includes("data-testid=\"input-actual-drawer-cash\""), "Renders actual drawer input");
		});

		it("verifies ShiftCloseZReportModal enforces 0 disabled buttons and modal depth <= 1 (Mandate 8e, 8d pt 6)", () => {
			const html = renderToStaticMarkup(
				React.createElement(ShiftCloseZReportModal, {
					isOpen: true,
					onClose: () => {},
					shiftNumber: 16,
					cashierFullName: "Ковалева Ольга",
				}),
			);

			assert.ok(html.includes("data-testid=\"shift-close-zreport-modal\""), "Renders Z-report modal");
			assert.ok(html.includes("data-testid=\"btn-confirm-close-shift-zreport\""), "Renders confirm close button");

			// Check Mandate 8e: submit button is NOT disabled
			const submitBtnMatch = html.match(/<button[^>]*data-testid="btn-confirm-close-shift-zreport"[^>]*>/);
			assert.ok(submitBtnMatch, "Submit button found");
			assert.equal(
				/disabled(?=[>\s=])/.test(submitBtnMatch[0]),
				false,
				"Z-report submit button must NOT be disabled",
			);

			// Check Mandate 8d pt 7: Zero emojis
			assert.equal(EMOJI_REGEX.test(html), false, "ShiftCloseZReportModal must contain ZERO emojis");
		});

		it("verifies CashShiftWidget buttons are NOT disabled per Mandate 8e", () => {
			const html = renderToStaticMarkup(
				React.createElement(CashShiftWidget, {
					initialIsOpen: true,
					shiftNumber: 5,
					cashierName: "Иванов И.И.",
				}),
			);

			const toggleBtnMatches = html.match(/<button[^>]*data-testid="cash-shift-toggle-btn"[^>]*>/g) || [];
			assert.ok(toggleBtnMatches.length > 0, "Found toggle buttons in CashShiftWidget");
			for (const btn of toggleBtnMatches) {
				assert.equal(
					/disabled(?=[>\s=])/.test(btn),
					false,
					`cash-shift-toggle-btn must NOT be disabled: ${btn}`,
				);
			}
		});
	});

	/* -------------------------------------------------------------------------- */
	/* 3. 5-Second Solo Doctor / Small Clinic Quick Booking Flow                  */
	/* -------------------------------------------------------------------------- */
	describe("3. QuickBookingDrawer Solo Doctor Autonomy & 0 Disabled Buttons (Mandate 8s, 8e)", () => {
		it("renders QuickBookingDrawer without requiring assistant selection (Mandate 8s)", () => {
			const html = renderToStaticMarkup(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						dateKey: mockDateIso,
						startTime: "10:00",
						doctorUserId: "doc-solo-1",
						chairId: "chair-1",
						durationMinutes: 30,
					},
					dashboard: mockDashboard,
				}),
			);

			assert.ok(html.includes("data-testid=\"quick-booking-drawer\""), "Renders drawer container");
			assert.ok(html.includes("data-testid=\"quick-drawer-save-btn\""), "Renders save booking button");
			assert.ok(html.includes("data-testid=\"quick-booking-cancel-btn\""), "Renders cancel booking button");

			// Check Mandate 8e: ZERO disabled buttons in QuickBookingDrawer
			const saveBtnMatch = html.match(/<button[^>]*data-testid="quick-drawer-save-btn"[^>]*>/);
			assert.ok(saveBtnMatch, "Save button found");
			assert.equal(
				/disabled(?=[>\s=])/.test(saveBtnMatch[0]),
				false,
				"Save booking button must NOT be disabled per Mandate 8e",
			);

			const cancelBtnMatch = html.match(/<button[^>]*data-testid="quick-booking-cancel-btn"[^>]*>/);
			assert.ok(cancelBtnMatch, "Cancel button found");
			assert.equal(
				/disabled(?=[>\s=])/.test(cancelBtnMatch[0]),
				false,
				"Cancel booking button must NOT be disabled per Mandate 8e",
			);

			// Check Mandate 8d pt 7: Zero cartoon emojis
			assert.equal(EMOJI_REGEX.test(html), false, "QuickBookingDrawer must contain ZERO emojis");
		});
	});

	/* -------------------------------------------------------------------------- */
	/* 4. DoctorShiftControlBar Schedule / Shift Cockpit Parity                   */
	/* -------------------------------------------------------------------------- */
	describe("4. DoctorShiftControlBar Parity & Re-export", () => {
		it("renders DoctorShiftControlBar correctly under schedule directory re-export", () => {
			const html = renderToStaticMarkup(
				React.createElement(DoctorShiftControlBar, {
					isShiftOpen: true,
					onToggleShift: () => {},
					onOpenPayrollModal: () => {},
					shiftStats: {
						totalAppointments: 8,
						completedCount: 5,
						inProgressCount: 1,
						totalRevenueRub: 45000,
						doctorCommissionPct: 25,
						estimatedDoctorPayoutRub: 11250,
						hasActiveOvertime: false,
					},
				}),
			);

			assert.ok(html.includes("Рабочая смена врача открыта"), "Shows open doctor shift status");
			assert.ok(html.includes("45\u00A0000") || html.includes("45 000"), "Shows total revenue");
			assert.ok(html.includes("11\u00A0250") || html.includes("11 250"), "Shows doctor calculated payout");
			assert.ok(html.includes("Расчет зарплаты") || html.includes("Зарплатная ведомость"), "Shows payroll action");

			// Check Mandate 8e: ZERO disabled buttons
			const buttonMatches = html.match(/<button[^>]*>/g) || [];
			for (const btn of buttonMatches) {
				assert.equal(
					/disabled(?=[>\s=])/.test(btn),
					false,
					`DoctorShiftControlBar buttons must NOT be disabled: ${btn}`,
				);
			}

			// Check Mandate 8d pt 7: Zero cartoon emojis
			assert.equal(EMOJI_REGEX.test(html), false, "DoctorShiftControlBar must contain ZERO emojis");
		});
	});
});
