/**
 * doctorShiftRealityAndPurity.test.tsx
 *
 * DENTE Dental CRM — Red Team Verification Suite:
 * Production vs Demo Dual-Circuit Isolation, Doctor Schedule Partitioning,
 * Integer Kopecks Piece-Rate Calculation & Form 043/u Batch PEP Signing (63-FZ).
 *
 * Standards:
 * - Mandate 8c: Zero Mocks / Synthetic Data in Production mode.
 * - Mandate 8e: Doctor Autonomy & Non-blocking Clinical Workflows.
 * - Mandate 8k: CRM != Reality Simulator (Honest Dual-Circuit Separation).
 * - Mandate 8x: Anti-RAM-Hog (Pure SSR / Node Test Runner).
 */

import React from "react";
import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import {
	filterDoctorShiftAppointments,
	calculateDoctorShiftEarnings,
	calculateServicePieceRateAccrual,
	initiateBatchEmrSigning,
	verifyAndSignBatchEmr,
	transitionAppointmentStatus,
	adaptToDoctorShiftAppointments,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
} from "@dental/shared";
import { DoctorMobileShiftModal } from "../DoctorMobileShiftModal.js";
import { setRuntimeDemoMode } from "../../../lib/demoMode.js";

describe("Doctor Shift Reality & Dual-Circuit Purity (THE HAMMER Mandate 8c & 8e)", () => {
	beforeEach(() => {
		setRuntimeDemoMode(false);
	});

	afterEach(() => {
		setRuntimeDemoMode(false);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 1. PRODUCTION MODE: HONEST EMPTY STATE & ZERO SYNTHETIC LEAKAGE
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Production Circuit Isolation (Mandate 8c)", () => {
		it("renders honest empty state when doctor has no appointments in production", () => {
			setRuntimeDemoMode(false);

			const html = renderToString(
				<DoctorMobileShiftModal
					isOpen={true}
					onClose={() => {}}
					initialDoctorId="doc-real-1"
					initialDoctorName="Д-р Воронов М. С."
					initialDoctorSpecialty="Врач-стоматолог терапевт"
					initialShiftDateIso="2026-10-08"
					initialAppointments={[]}
				/>,
			);

			// Must render honest empty state
			assert.ok(
				html.includes('data-testid="empty-shift-state"'),
				"Should display data-testid='empty-shift-state'",
			);
			assert.ok(
				html.includes("На сегодня приемов не запланировано"),
				"Should display honest Russian empty state message",
			);
			assert.ok(
				html.includes('data-testid="emergency-patient-btn"'),
				"Should provide 1-click emergency reception button for acute pain",
			);

			// Financial metrics must be 0 ₽ — absolutely zero synthetic revenue
			assert.ok(
				html.includes('data-testid="doctor-earned-deal-amount"'),
				"Should display piece-rate earnings counter",
			);
			assert.ok(
				html.includes("0&nbsp;₽") || html.includes("0 ₽") || html.includes("0\u00A0₽"),
				"Production empty shift earnings must be exactly 0 ₽",
			);

			// Zero synthetic showcase patients leakage
			assert.ok(!html.includes("Захаров"), "Must not leak demo patient 'Захаров' in production");
			assert.ok(!html.includes("Ковалева"), "Must not leak demo patient 'Ковалева' in production");
		});

		it("adapts live appointments in production without synthetic fallback injection", () => {
			setRuntimeDemoMode(false);

			const rawAppointments = [
				{
					id: "live-apt-1",
					doctorId: "doc-live-1",
					patientId: "pat-live-1",
					startsAt: "2026-10-08T11:00:00.000Z",
					endsAt: "2026-10-08T12:00:00.000Z",
					status: "in_chair",
					services: [
						{
							id: "srv-live-1",
							code804n: "A16.07.002",
							nameRu: "Лечение кариеса дентина",
							category: "therapy",
							finalRevenueKop: 600000, // 6 000 ₽
							directLabZtlCostKop: 0,
							directMaterialCostKop: 80000, // 800 ₽
							commissionPercent: 25,
						},
					],
				},
			];

			const patients = [
				{
					id: "pat-live-1",
					fullName: "Иванов Иван Иванович",
					cardNumber: "КАРТА-101",
				},
			];

			const html = renderToString(
				<DoctorMobileShiftModal
					isOpen={true}
					onClose={() => {}}
					initialDoctorId="doc-live-1"
					initialDoctorName="Д-р Кузнецов С. И."
					initialDoctorSpecialty="Терапевт"
					initialShiftDateIso="2026-10-08"
					rawAppointments={rawAppointments}
					patients={patients}
				/>,
			);

			assert.ok(html.includes("Иванов Иван Иванович"), "Should render real patient name");
			assert.ok(html.includes("КАРТА-101"), "Should render real patient card number");
			assert.ok(!html.includes('data-testid="empty-shift-state"'), "Should not be empty state");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. DEMO SHOWCASE CIRCUIT: FULL SHIFT WORKFLOW
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Demo Showcase Circuit (Mandate 8k)", () => {
		it("loads dense showcase shift when runtime demo mode is active", () => {
			setRuntimeDemoMode(true);

			const html = renderToString(
				<DoctorMobileShiftModal
					isOpen={true}
					onClose={() => {}}
					initialDoctorId="doc-1"
					initialDoctorName="Д-р Смирнов Алексей Петрович"
					initialDoctorSpecialty="Терапевт-ортопед"
					initialShiftDateIso="2026-08-29"
				/>,
			);

			// In demo mode, appointments must be automatically populated from showcase seeder
			assert.ok(
				!html.includes('data-testid="empty-shift-state"'),
				"Demo mode must not show empty state",
			);
			assert.ok(
				html.includes('data-testid="appointment-card-apt-shift-01"'),
				"Should display first showcase appointment",
			);
			assert.ok(
				html.includes('data-testid="batch-pep-banner"'),
				"Should render batch PEP signing banner for completed appointments requiring signature",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. DOCTOR SCHEDULE ISOLATION (ZERO CROSS-DOCTOR LEAKAGE)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Doctor Schedule Isolation", () => {
		it("strictly partitions appointments by doctorId and shiftDate", () => {
			const doc1Appointments = filterDoctorShiftAppointments(
				SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				"doc-1",
				"2026-08-29",
			);
			const doc2Appointments = filterDoctorShiftAppointments(
				SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				"doc-2",
				"2026-08-29",
			);

			// Doctor 1 has 5 appointments
			assert.strictEqual(doc1Appointments.length, 5);
			for (const apt of doc1Appointments) {
				assert.strictEqual(apt.doctorId, "doc-1");
				assert.strictEqual(apt.startsAtIso.split("T")[0], "2026-08-29");
			}

			// Doctor 2 has 1 surgery appointment
			assert.strictEqual(doc2Appointments.length, 1);
			assert.strictEqual(doc2Appointments[0]!.doctorId, "doc-2");
			assert.strictEqual(doc2Appointments[0]!.id, "apt-shift-other-doctor");

			// Complete disjointness
			const doc1Ids = new Set(doc1Appointments.map((a) => a.id));
			assert.ok(!doc1Ids.has("apt-shift-other-doctor"), "Doctor 1 must never see Doctor 2 appointments");
		});

		it("adaptToDoctorShiftAppointments filters out other doctors' records", () => {
			const mixedAppointments = [
				{
					id: "mixed-1",
					doctorId: "doc-target",
					startsAt: "2026-10-08T09:00:00.000Z",
					status: "waiting",
				},
				{
					id: "mixed-2",
					doctorId: "doc-other",
					startsAt: "2026-10-08T10:00:00.000Z",
					status: "waiting",
				},
			];

			const adapted = adaptToDoctorShiftAppointments({
				appointments: mixedAppointments,
				doctorId: "doc-target",
				shiftDateIso: "2026-10-08",
			});

			assert.strictEqual(adapted.length, 1);
			assert.strictEqual(adapted[0]!.id, "mixed-1");
			assert.strictEqual(adapted[0]!.doctorId, "doc-target");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. INTEGER KOPECKS PIECE-RATE CALCULATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Integer Kopecks Piece-Rate Calculation", () => {
		it("calculates service commission deducting ZTL lab costs and direct materials", () => {
			// Revenue: 50 000.00 ₽ (5 000 000 коп)
			// ZTL lab cost: 12 000.00 ₽ (1 200 000 коп)
			// Direct materials: 3 000.00 ₽ (300 000 коп)
			// Commission: 25%
			// Deal base = 5 000 000 - 1 200 000 - 300 000 = 3 500 000 коп (35 000.00 ₽)
			// Payout = 3 500 000 * 25 / 100 = 875 000 коп (8 750.00 ₽)
			const accrual = calculateServicePieceRateAccrual({
				finalRevenueKop: 5000000,
				directLabZtlCostKop: 1200000,
				directMaterialCostKop: 300000,
				commissionPercent: 25,
			});

			assert.strictEqual(accrual.dealBaseKop, 3500000);
			assert.strictEqual(accrual.earnedPayoutKop, 875000);
		});

		it("prevents negative deal base when laboratory and materials exceed revenue", () => {
			const accrual = calculateServicePieceRateAccrual({
				finalRevenueKop: 200000, // 2 000 ₽
				directLabZtlCostKop: 250000, // 2 500 ₽ (exceeds revenue)
				directMaterialCostKop: 50000, // 500 ₽
				commissionPercent: 25,
			});

			assert.strictEqual(accrual.dealBaseKop, 0, "Deal base must be clamped to 0 kopecks");
			assert.strictEqual(accrual.earnedPayoutKop, 0, "Payout must be 0 kopecks");
		});

		it("calculates exact shift earnings breakdown across all shift appointments", () => {
			const earnings = calculateDoctorShiftEarnings(
				SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				"doc-1",
				"2026-08-29",
			);

			assert.strictEqual(earnings.totalAppointmentsCount, 5);
			assert.strictEqual(earnings.completedAppointmentsCount, 3);
			assert.strictEqual(earnings.inChairAppointmentsCount, 1);
			assert.strictEqual(earnings.waitingAppointmentsCount, 1);

			// Integrity: DealBase = Gross - Lab - Material
			assert.strictEqual(
				earnings.netDealBaseKop,
				earnings.grossRevenueKop - earnings.totalLabDeductionsKop - earnings.totalMaterialDeductionsKop,
				"Net deal base must exactly equal Gross - Lab - Material deductions in integer kopecks",
			);

			// Total earned must be positive integer kopecks
			assert.ok(earnings.totalEarnedDealKop > 0);
			assert.strictEqual(Math.round(earnings.totalEarnedDealKop), earnings.totalEarnedDealKop);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. BATCH PEP (ПЭП) SIGNING PROTOCOL (63-FZ & ORDER 947N)
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Form 043/u Batch PEP Signing Protocol", () => {
		it("initiates SMS signing session with valid expiry, masked phone and SHA-256 batch hash", () => {
			const session = initiateBatchEmrSigning({
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов А. П.",
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: ["apt-doc1-1", "apt-doc1-2"],
				shiftDateIso: "2026-08-29",
				fixedSecretCode: "123456",
			});

			assert.strictEqual(session.doctorId, "doc-1");
			assert.strictEqual(session.maskedPhone, "+7 (926) ***-**-34");
			assert.strictEqual(session.secretCode, "123456");
			assert.strictEqual(session.appointmentIds.length, 2);
			assert.ok(session.batchHash.startsWith("RU-PEP-043U-"), "Must have RU-PEP protocol prefix");
			assert.strictEqual(session.isVerified, false);
		});

		it("verifies and signs batch EMR with correct SMS code", () => {
			const session = initiateBatchEmrSigning({
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов А. П.",
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: ["apt-shift-02", "apt-shift-03"],
				shiftDateIso: "2026-08-29",
				fixedSecretCode: "654321",
			});

			const appointmentsToSign = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS.filter((a) =>
				session.appointmentIds.includes(a.id),
			);

			const result = verifyAndSignBatchEmr({
				session,
				enteredCode: "654321",
				appointments: appointmentsToSign,
				doctorName: "Д-р Смирнов А. П.",
				authMethod: "sms",
			});

			assert.strictEqual(result.success, true);
			assert.strictEqual(result.signedCount, 2);
			for (const apt of result.updatedAppointments) {
				assert.strictEqual(apt.emrCard043uStatus, "signed");
				assert.ok(apt.emrPepProtocolHash?.startsWith("RU-PEP-043U-"));
				assert.strictEqual(apt.emrSignerInfo?.name, "Д-р Смирнов А. П.");
			}
		});

		it("allows immediate session PEP signing under 63-FZ Art. 9 when cell reception is unavailable", () => {
			const session = initiateBatchEmrSigning({
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов А. П.",
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: ["apt-shift-02"],
				shiftDateIso: "2026-08-29",
			});

			const appointmentsToSign = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS.filter((a) =>
				session.appointmentIds.includes(a.id),
			);

			// Doctor invokes session PEP fallback directly without waiting for SMS
			const result = verifyAndSignBatchEmr({
				session,
				appointments: appointmentsToSign,
				doctorName: "Д-р Смирнов А. П.",
				authMethod: "session_pep",
			});

			assert.strictEqual(result.success, true);
			assert.strictEqual(result.signedCount, 1);
			assert.strictEqual(result.updatedAppointments[0]!.emrCard043uStatus, "signed");
		});

		it("transitions appointment status cleanly through clinical lifecycle", () => {
			const apt = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS[4]!; // "waiting" appointment (apt-shift-05)
			assert.strictEqual(apt.status, "waiting");

			const inChair = transitionAppointmentStatus(apt, "in_chair");
			assert.strictEqual(inChair.status, "in_chair");
			assert.ok(inChair.actualStartsAtIso);

			const completed = transitionAppointmentStatus(inChair, "completed");
			assert.strictEqual(completed.status, "completed");
			assert.ok(completed.actualEndsAtIso);
		});
	});
});
