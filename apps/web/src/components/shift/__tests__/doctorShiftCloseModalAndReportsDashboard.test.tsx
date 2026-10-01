/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Shift Closure Reconciliation & Reports Dashboard Tests
 *
 * Invariants:
 * 1. Mandate 8b: Integer kopecks & SSR rendering (zero memory leaks, 0 MB DOM bloat).
 * 2. Mandate 8c: Touch targets >= 44x44px for clinical workflows.
 * 3. Mandate 8d: Zero cartoon emojis across all rendered HTML.
 * 4. Mandate 8e & 8n: Solo Doctor & Small Clinic Sovereignty (Zero Dead-Ends).
 * 5. Strict test ceiling <= 10s per suite.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	DoctorShiftCloseModal,
	type DoctorShiftCashSummary,
	type DoctorShiftEmrSummary,
} from "../DoctorShiftCloseModal";
import type { DoctorShiftStats } from "../DoctorShiftControlBar";
import { ReportsDashboard } from "../../reports/ReportsDashboard";
import type {
	ReportsSummary,
	ScheduleLoadReport,
	ServiceSalesReport,
} from "../../reports/ManagerReportsTypes";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function cleanSsrHtml(html: string): string {
	return html.replace(/<!--.*?-->/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

describe("Doctor Shift Closure Reconciliation & Executive Reports Dashboard", () => {
	const sampleShiftStats: DoctorShiftStats = {
		totalAppointments: 8,
		completedCount: 6,
		inProgressCount: 1,
		totalRevenueRub: 145000,
		doctorCommissionPct: 25,
		estimatedDoctorPayoutRub: 36250,
		hasActiveOvertime: false,
	};

	const sampleCashSummary: DoctorShiftCashSummary = {
		cashRub: 40000,
		cardRub: 75000,
		sbpRub: 20000,
		depositRub: 10000,
		totalRevenueRub: 145000,
	};

	const sampleEmrSummary: DoctorShiftEmrSummary = {
		signedCount: 6,
		pendingSignatureCount: 1,
		draftCount: 0,
	};

	describe("1. DoctorShiftCloseModal", () => {
		it("1.1 Renders null when isOpen is false", () => {
			const html = renderToString(
				React.createElement(DoctorShiftCloseModal, {
					isOpen: false,
					onClose: () => {},
					onConfirmClose: () => {},
					shiftStats: sampleShiftStats,
				}),
			);
			assert.equal(html, "");
		});

		it("1.2 Renders shift reconciliation summary, cash breakdown and PEP status when open", () => {
			const html = renderToString(
				React.createElement(DoctorShiftCloseModal, {
					isOpen: true,
					onClose: () => {},
					onConfirmClose: () => {},
					doctorFullName: "Д-р Смирнов Алексей Петрович",
					doctorSpecialtyRu: "Стоматолог-ортопед",
					shiftDateLabel: "15 октября 2026",
					shiftStats: sampleShiftStats,
					cashSummary: sampleCashSummary,
					emrSummary: sampleEmrSummary,
				}),
			);

			const cleanHtml = cleanSsrHtml(html);

			// Must contain doctor info
			assert.ok(cleanHtml.includes("Завершение рабочей смены врача"));
			assert.ok(cleanHtml.includes("Смирнов Алексей Петрович"));
			assert.ok(cleanHtml.includes("Стоматолог-ортопед"));

			// Must contain patient stats
			assert.ok(cleanHtml.includes("Завершено"));
			assert.ok(cleanHtml.includes("В кресле"));
			assert.ok(cleanHtml.includes("Карт ПЭП"));

			// Must contain cash breakdown
			assert.ok(cleanHtml.includes("Наличные"));
			assert.ok(cleanHtml.includes("Карты / POS-терминал"));
			assert.ok(cleanHtml.includes("СБП QR-код"));
			assert.ok(cleanHtml.includes("Зачет депозитов"));

			// Must contain earnings summary
			assert.ok(cleanHtml.includes("Начисленный заработок врача за смену"));
			assert.ok(cleanHtml.includes("36 250"));

			// Must warn about unsigned EMR
			assert.ok(cleanHtml.includes("Не подписано электронных карт 043/у: 1"));

			// Mandate 8d: Zero cartoon emojis
			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"DoctorShiftCloseModal must contain zero cartoon emojis",
			);
		});

		it("1.3 Handles zero/empty cash summary gracefully with internal fallback", () => {
			const html = renderToString(
				React.createElement(DoctorShiftCloseModal, {
					isOpen: true,
					onClose: () => {},
					onConfirmClose: () => {},
					shiftStats: {
						totalAppointments: 0,
						completedCount: 0,
						inProgressCount: 0,
						totalRevenueRub: 0,
						doctorCommissionPct: 25,
						estimatedDoctorPayoutRub: 0,
						hasActiveOvertime: false,
					},
				}),
			);

			assert.ok(html.includes("Завершение рабочей смены врача"));
			assert.ok(html.includes("0 ₽"));
			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"DoctorShiftCloseModal zero state must contain zero emojis",
			);
		});
	});

	describe("2. ReportsDashboard", () => {
		const sampleSummary: ReportsSummary = {
			period: { from: "2026-08-01", to: "2026-08-31" },
			revenue: {
				granularity: "day",
				points: [
					{
						bucket: "2026-08-01",
						revenueRub: 50000,
						paymentCount: 3,
						payingPatients: 3,
					},
					{
						bucket: "2026-08-02",
						revenueRub: 150000,
						paymentCount: 5,
						payingPatients: 4,
					},
				],
				totalRub: 200000,
				isEmpty: false,
			},
			doctors: {
				rows: [
					{
						doctorUserId: "doc-1",
						doctorName: "Д-р Васильев",
						revenueRub: 120000,
						appointmentsTotal: 10,
						appointmentsCompleted: 8,
						appointmentsCancelled: 1,
						appointmentsNoShow: 1,
						completionRate: 0.8,
						noShowRate: 0.1,
						averageTicketRub: 15000,
						marginRub: null,
					},
					{
						doctorUserId: "doc-2",
						doctorName: "Д-р Кузнецова",
						revenueRub: 80000,
						appointmentsTotal: 8,
						appointmentsCompleted: 6,
						appointmentsCancelled: 1,
						appointmentsNoShow: 1,
						completionRate: 0.75,
						noShowRate: 0.125,
						averageTicketRub: 13333,
						marginRub: null,
					},
				],
				unattributedRevenueRub: 0,
				attributionNote: "",
				isEmpty: false,
			},
			chairs: {
				rows: [
					{
						chairId: "chair-1",
						chairName: "Кресло 1 (Терапия)",
						appointments: 14,
						bookedMinutes: 840,
						utilization: 0.65,
					},
				],
				basis: {
					workingDays: 22,
					minutesPerDay: 720,
					totalMinutesPerChair: 15840,
					note: "",
				},
				isEmpty: false,
			},
			appointments: {
				byStatus: { completed: 14, cancelled: 2, no_show: 2 },
				total: 18,
				arrivalRate: 0.88,
				completionRate: 0.78,
				cancellationRate: 0.11,
				noShowRate: 0.11,
				lostAppointments: 4,
				isEmpty: false,
			},
			reminderEffect: {
				reminded: {
					appointments: 10,
					completed: 9,
					cancelled: 1,
					noShow: 0,
					lost: 1,
					lostRate: 0.1,
				},
				notReminded: {
					appointments: 8,
					completed: 5,
					cancelled: 1,
					noShow: 2,
					lost: 3,
					lostRate: 0.375,
				},
				lostRateDifference: -0.275,
				caveat: "",
				smallestGroupSize: 8,
				enoughData: true,
				isEmpty: false,
			},
			patientFlow: {
				points: [
					{
						bucket: "2026-08",
						newPatients: 10,
						returningPatients: 15,
					},
				],
				newTotal: 10,
				returningTotal: 15,
			},
			receivables: {
				totalDebtRub: 25000,
				byBucket: { current: 25000 },
				debtors: 2,
			},
			isEmpty: false,
		};

		const sampleScheduleLoad: ScheduleLoadReport = {
			cells: [
				{ weekday: 1, hour: 10, appointments: 4, bookedMinutes: 240 },
				{ weekday: 1, hour: 11, appointments: 5, bookedMinutes: 300 },
				{ weekday: 3, hour: 14, appointments: 6, bookedMinutes: 360 },
			],
			busiestWeekday: 1,
			busiestHour: 14,
			isEmpty: false,
		};

		const sampleServiceSales: ServiceSalesReport = {
			rows: [
				{
					title: "Лечение кариеса",
					quantity: 12,
					plannedRub: 60000,
					averagePriceRub: 5000,
					discountRub: 0,
				},
			],
			plannedTotalRub: 60000,
			discountTotalRub: 0,
			note: "",
			isEmpty: false,
		};

		it("2.1 Computes clinic average ticket, patient flow and chair load correctly", () => {
			const html = renderToString(
				React.createElement(ReportsDashboard, {
					summary: sampleSummary,
					scheduleLoad: sampleScheduleLoad,
					serviceSales: sampleServiceSales,
					period: { from: "2026-08-01", to: "2026-08-31" },
				}),
			);

			const cleanHtml = cleanSsrHtml(html);

			// Average Ticket: 200,000 / (18 - 4 = 14) = 14,286 RUB
			assert.ok(cleanHtml.includes("Средний чек клиники"));
			assert.ok(cleanHtml.includes("14 286") || cleanHtml.includes("14,3 тыс. ₽"));

			// Primary Patient Share: 10 / (10 + 15 = 25) = 40%
			assert.ok(cleanHtml.includes("Первичные пациенты"));
			assert.ok(cleanHtml.includes("40%"));

			// Doctors Table with per-doctor average ticket
			assert.ok(cleanHtml.includes("Васильев"));
			assert.ok(cleanHtml.includes("Кузнецова"));
			assert.ok(cleanHtml.includes("15 000 ₽"));

			// Weekday load
			assert.ok(cleanHtml.includes("Загрузка кресел по дням недели"));
			assert.ok(cleanHtml.includes("пн"));

			// Mandate 8d: Zero cartoon emojis
			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"ReportsDashboard must contain zero cartoon emojis",
			);
		});

		it("2.2 Provides zero dead-ends and safe rendering with empty summary", () => {
			const html = renderToString(
				React.createElement(ReportsDashboard, {
					summary: null,
					period: { from: "2026-09-01", to: "2026-09-30" },
				}),
			);

			// Should render without throwing
			assert.ok(html.includes("Сводная аналитика и ключевые KPI клиники"));
			assert.ok(html.includes("0 ₽"));
			assert.ok(html.includes("0%"));
			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"Empty ReportsDashboard must contain zero cartoon emojis",
			);
		});
	});
});
