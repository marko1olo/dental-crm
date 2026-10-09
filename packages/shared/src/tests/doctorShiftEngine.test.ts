/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Operations & Mobile PWA Engine Tests (Wave 21)
 *
 * Comprehensive validation:
 * 1. Complete Doctor Schedule Isolation (Zero Cross-Doctor Leakage).
 * 2. Exact Integer Kopecks Piece-Rate Calculation with ZTL Laboratory Deductions.
 * 3. Batch EMR 043/у Simple Electronic Signature (ПЭП) Protocol (63-ФЗ, 834н, 947н).
 * 4. Clinical State Machine Transitions (waiting -> in_chair -> completed).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	doctorAppointmentStatusSchema,
	emr043CardStatusSchema,
	doctorShiftServiceItemSchema,
	doctorShiftAppointmentSchema,
	emrBatchSigningSessionSchema,
	doctorShiftRecordSchema,
	doctorShiftBreakIntervalSchema,
	filterDoctorShiftAppointments,
	adaptToDoctorShiftAppointments,
	calculateServicePieceRateAccrual,
	calculateDoctorShiftEarnings,
	calculateDoctorShiftWorklog,
	generateBatchEmrProtocolHash,
	maskDoctorPhoneNumber,
	initiateBatchEmrSigning,
	verifyAndSignBatchEmr,
	transitionAppointmentStatus,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	detectChairShiftConflicts,
	detectDoctorShiftCollisions,
	validateShiftIntervalsNoOverlap,
	calculateNightShiftMinutes,
	calculateIntervalDurationMinutes,
	isIsoIntervalOverlap,
	shiftDateFromIso,
	type DoctorShiftAppointment,
	type DoctorShiftServiceItem,
} from "../doctor-portal/doctorShiftEngine.js";
import { generateDoctorShiftNumber } from "../utils/idGenerators.js";
import * as ShiftEngineBarrel from "../doctor-portal/shiftEngine/index.js";

describe("Wave 21 Domain 2: Doctor Shift Engine & Mobile PWA Operations", () => {
	describe("1. Zod Schemas & Domain Enums", () => {
		it("1.1 validates doctorAppointmentStatusSchema correctly", () => {
			assert.equal(doctorAppointmentStatusSchema.parse("waiting"), "waiting");
			assert.equal(doctorAppointmentStatusSchema.parse("in_chair"), "in_chair");
			assert.equal(doctorAppointmentStatusSchema.parse("completed"), "completed");
			assert.equal(doctorAppointmentStatusSchema.parse("cancelled"), "cancelled");
			assert.equal(doctorAppointmentStatusSchema.parse("no_show"), "no_show");
			assert.throws(() => doctorAppointmentStatusSchema.parse("invalid_status"));
		});

		it("1.2 validates emr043CardStatusSchema correctly", () => {
			assert.equal(emr043CardStatusSchema.parse("draft"), "draft");
			assert.equal(emr043CardStatusSchema.parse("pending_signature"), "pending_signature");
			assert.equal(emr043CardStatusSchema.parse("signed"), "signed");
			assert.throws(() => emr043CardStatusSchema.parse("approved"));
		});

		it("1.3 validates doctorShiftServiceItemSchema with integer kopecks", () => {
			const item: DoctorShiftServiceItem = {
				id: "srv-test-1",
				code804n: "A16.07.002.001",
				nameRu: "Наложение пломбы Ceram.x Spectra ST",
				category: "therapy",
				quantity: 1,
				unitPriceKop: 650000,
				totalCostKop: 650000,
				discountKop: 0,
				finalRevenueKop: 650000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 50000,
				commissionPercent: 25,
				earnedDoctorPayoutKop: 150000,
			};
			const parsed = doctorShiftServiceItemSchema.parse(item);
			assert.equal(parsed.finalRevenueKop, 650000);
			assert.equal(parsed.earnedDoctorPayoutKop, 150000);
		});

		it("1.4 validates full doctorShiftAppointmentSchema structure", () => {
			const apt = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS[0];
			assert.doesNotThrow(() => doctorShiftAppointmentSchema.parse(apt));
		});
	});

	describe("2. Doctor Schedule Isolation & Date Partitioning", () => {
		it("2.1 strictly isolates appointments for doc-1 and filters out other practitioners", () => {
			const isolated = filterDoctorShiftAppointments(
				SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				"doc-1",
				"2026-08-29",
			);

			assert.equal(isolated.length, 5);
			// Verify all returned appointments belong strictly to doc-1
			for (const apt of isolated) {
				assert.equal(apt.doctorId, "doc-1");
				assert.notEqual(apt.doctorId, "doc-2");
				assert.notEqual(apt.patientFullName, "Иванов Петр Сергеевич");
			}
		});

		it("2.2 isolates appointments for doc-2 independently", () => {
			const isolatedDoc2 = filterDoctorShiftAppointments(
				SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				"doc-2",
				"2026-08-29",
			);

			assert.equal(isolatedDoc2.length, 1);
			assert.equal(isolatedDoc2[0]?.patientFullName, "Иванов Петр Сергеевич");
			assert.equal(isolatedDoc2[0]?.doctorId, "doc-2");
		});

		it("2.3 sorts appointments chronologically by startsAtIso", () => {
			const isolated = filterDoctorShiftAppointments(
				SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				"doc-1",
				"2026-08-29",
			);

			for (let i = 0; i < isolated.length - 1; i++) {
				const current = new Date(isolated[i]!.startsAtIso).getTime();
				const next = new Date(isolated[i + 1]!.startsAtIso).getTime();
				assert.ok(current <= next, "Appointments must be chronologically ordered");
			}
		});

		it("2.4 returns empty array for nonexistent doctor or date with zero appointments", () => {
			assert.deepEqual(
				filterDoctorShiftAppointments(SAMPLE_DOCTOR_SHIFT_APPOINTMENTS, "doc-999", "2026-08-29"),
				[],
			);
			assert.deepEqual(
				filterDoctorShiftAppointments(SAMPLE_DOCTOR_SHIFT_APPOINTMENTS, "doc-1", "2029-01-01"),
				[],
			);
			assert.deepEqual(
				filterDoctorShiftAppointments(SAMPLE_DOCTOR_SHIFT_APPOINTMENTS, "", "2026-08-29"),
				[],
			);
		});
	});

	describe("3. Real-Time Piece-Rate Accrual & Exact Integer Kopecks Math", () => {
		it("3.1 calculates service piece-rate with direct material deduction", () => {
			// Gross 6500.00 RUB, Mat 500.00 RUB, 25% -> Base 6000.00 RUB * 25% = 1500.00 RUB (150000 kop)
			const res = calculateServicePieceRateAccrual({
				finalRevenueKop: 650000,
				directMaterialCostKop: 50000,
				commissionPercent: 25,
			});
			assert.equal(res.dealBaseKop, 600000);
			assert.equal(res.earnedPayoutKop, 150000);
		});

		it("3.2 calculates service piece-rate with Dental Laboratory (ЗТЛ) deduction", () => {
			// Gross 32000.00 RUB, ZTL Lab 8000.00 RUB, 15% -> Base 24000.00 RUB * 15% = 3600.00 RUB (360000 kop)
			const res = calculateServicePieceRateAccrual({
				finalRevenueKop: 3200000,
				directLabZtlCostKop: 800000,
				directMaterialCostKop: 0,
				commissionPercent: 15,
			});
			assert.equal(res.dealBaseKop, 2400000);
			assert.equal(res.earnedPayoutKop, 360000);
		});

		it("3.3 clamps negative base to 0 when deductions exceed revenue", () => {
			const res = calculateServicePieceRateAccrual({
				finalRevenueKop: 100000,
				directLabZtlCostKop: 150000, // Exceeds revenue
				commissionPercent: 20,
			});
			assert.equal(res.dealBaseKop, 0);
			assert.equal(res.earnedPayoutKop, 0);
		});

		it("3.4 computes live doctor shift summary accurately across all appointments", () => {
			const summary = calculateDoctorShiftEarnings(
				SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				"doc-1",
				"2026-08-29",
			);

			assert.equal(summary.doctorId, "doc-1");
			assert.equal(summary.totalAppointmentsCount, 5);
			assert.equal(summary.completedAppointmentsCount, 3);
			assert.equal(summary.inChairAppointmentsCount, 1);
			assert.equal(summary.waitingAppointmentsCount, 1);
			assert.equal(summary.cancelledAppointmentsCount, 0);

			// Completed + In-Chair visits:
			// apt-1: 6500 + 1200 = 7700 RUB (770000 kop), Lab: 0, Mat: 700 RUB (70000 kop), Earned: 1500 + 250 = 1750 RUB (175000 kop)
			// apt-2: 32000 RUB (3200000 kop), Lab: 8000 RUB (800000 kop), Mat: 0, Earned: 3600 RUB (360000 kop)
			// apt-3: 10000 + 8400 = 18400 RUB (1840000 kop), Lab: 0, Mat: 3400 RUB (340000 kop), Earned: 2000 + 1750 = 3750 RUB (375000 kop)
			// apt-4 (in chair): 8500 RUB (850000 kop), Lab: 0, Mat: 500 RUB (50000 kop), Earned: 2400 RUB (240000 kop)
			// apt-5 (waiting): not yet accrued in active earnings.
			// Total Gross = 7700 + 32000 + 18400 + 8500 = 66600 RUB = 6660000 kop
			// Total Lab = 8000 RUB = 800000 kop
			// Total Mat = 700 + 3400 + 500 = 4600 RUB = 460000 kop
			// Net Deal Base = 66600 - 8000 - 4600 = 54000 RUB = 5400000 kop
			// Total Earned = 1750 + 3600 + 3750 + 2400 = 11500 RUB = 1150000 kop

			assert.equal(summary.grossRevenueKop, 6660000);
			assert.equal(summary.totalLabDeductionsKop, 800000);
			assert.equal(summary.totalMaterialDeductionsKop, 460000);
			assert.equal(summary.netDealBaseKop, 5400000);
			assert.equal(summary.totalEarnedDealKop, 1150000);

			// EMR status counts
			assert.equal(summary.signedEmr043Count, 1);
			assert.equal(summary.unsignedEmr043Count, 2); // apt-02 & apt-03 completed but pending_signature
		});
	});

	describe("4. Batch EMR 043/у PEP (ПЭП) Signing Protocol", () => {
		it("4.1 generates cryptographic protocol hash stamp for batch", () => {
			const hash = generateBatchEmrProtocolHash(
				["apt-shift-02", "apt-shift-03"],
				"doc-1",
				"2026-08-29T16:00:00.000Z",
			);
			assert.ok(hash.startsWith("RU-PEP-043U-"));
			assert.equal(hash.length, 20);
		});

		it("4.2 masks doctor phone number securely for SMS delivery", () => {
			const masked = maskDoctorPhoneNumber("+7 (926) 555-12-34");
			assert.equal(masked, "+7 (926) ***-**-34");
		});

		it("4.3 initiates batch signing session with 6-digit code and 5min expiration", () => {
			const session = initiateBatchEmrSigning({
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: ["apt-shift-02", "apt-shift-03"],
				shiftDateIso: "2026-08-29",
				fixedSecretCode: "492815",
			});

			assert.equal(session.doctorId, "doc-1");
			assert.equal(session.secretCode, "492815");
			assert.equal(session.appointmentIds.length, 2);
			assert.doesNotThrow(() => emrBatchSigningSessionSchema.parse(session));
		});

		it("4.4 verifies correct SMS code and signs all batch appointments with PEP stamp", () => {
			const session = initiateBatchEmrSigning({
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: ["apt-shift-02", "apt-shift-03"],
				shiftDateIso: "2026-08-29",
				fixedSecretCode: "771204",
				currentTimeIso: "2026-08-29T16:00:00.000Z",
			});

			const signResult = verifyAndSignBatchEmr({
				session,
				enteredCode: "771204",
				appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorSnils: "123-456-789 64",
				signTimestampIso: "2026-08-29T16:02:00.000Z",
			});

			assert.equal(signResult.success, true);
			assert.equal(signResult.signedCount, 2);
			assert.deepEqual(signResult.signedAppointmentIds, ["apt-shift-02", "apt-shift-03"]);

			// Check updated appointments
			const signedApt2 = signResult.updatedAppointments.find((a) => a.id === "apt-shift-02");
			const signedApt3 = signResult.updatedAppointments.find((a) => a.id === "apt-shift-03");

			assert.equal(signedApt2?.emrCard043uStatus, "signed");
			assert.equal(signedApt2?.emrSignedAtIso, "2026-08-29T16:02:00.000Z");
			assert.ok(signedApt2?.emrPepProtocolHash?.startsWith("RU-PEP-043U-"));
			assert.equal(signedApt2?.emrSignerInfo?.name, "Д-р Смирнов Алексей Петрович");
			assert.equal(signedApt2?.emrSignerInfo?.snils, "123-456-789 64");

			assert.equal(signedApt3?.emrCard043uStatus, "signed");
		});

		it("4.5 rejects incorrect SMS verification code", () => {
			const session = initiateBatchEmrSigning({
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: ["apt-shift-02"],
				fixedSecretCode: "123456",
			});

			const result = verifyAndSignBatchEmr({
				session,
				enteredCode: "999999", // Wrong code
				appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				doctorName: "Д-р Смирнов Алексей Петрович",
			});

			assert.equal(result.success, false);
			assert.equal(result.signedCount, 0);
			assert.ok(result.messageRu.includes("Неверный СМС-код"));
		});

		it("4.6 rejects expired signing session", () => {
			const session = initiateBatchEmrSigning({
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: ["apt-shift-02"],
				fixedSecretCode: "123456",
				validityDurationSeconds: 10, // 10s
				currentTimeIso: "2026-08-29T16:00:00.000Z",
			});

			// Simulate attempt after 1 hour
			const result = verifyAndSignBatchEmr({
				session,
				enteredCode: "123456",
				appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				doctorName: "Д-р Смирнов Алексей Петрович",
				signTimestampIso: "2026-08-29T20:00:00.000Z",
			});

			assert.equal(result.success, false);
			assert.equal(result.signedCount, 0);
			assert.ok(result.messageRu.includes("Срок действия СМС-кода истек"));
		});
	});

	describe("5. Appointment Status Transitions", () => {
		it("5.1 transitions waiting to in_chair without modifying draft status", () => {
			const apt = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS[4]!; // waiting
			const updated = transitionAppointmentStatus(apt, "in_chair");
			assert.equal(updated.status, "in_chair");
			assert.equal(updated.emrCard043uStatus, "draft");
		});

		it("5.2 transitions in_chair to completed and automatically sets emrCard043uStatus to pending_signature", () => {
			const apt = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS[3]!; // in_chair with draft EMR
			const updated = transitionAppointmentStatus(apt, "completed");
			assert.equal(updated.status, "completed");
			assert.equal(updated.emrCard043uStatus, "pending_signature");
		});

		it("5.3 tracks honest actualStartsAtIso and actualEndsAtIso with duration on completion", () => {
			const apt = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS[4]!; // waiting
			const inChair = transitionAppointmentStatus(apt, "in_chair", {
				timestampIso: "2026-08-29T15:35:00.000Z",
			});
			assert.equal(inChair.actualStartsAtIso, "2026-08-29T15:35:00.000Z");

			const completed = transitionAppointmentStatus(inChair, "completed", {
				timestampIso: "2026-08-29T16:15:00.000Z",
			});
			assert.equal(completed.actualStartsAtIso, "2026-08-29T15:35:00.000Z");
			assert.equal(completed.actualEndsAtIso, "2026-08-29T16:15:00.000Z");
			assert.equal(completed.actualDurationMinutes, 40); // 15:35 to 16:15 = 40 min
		});
	});

	describe("6. Zero-Mock ID & Verification Engine (Mandates 8b, 8e)", () => {
		it("6.1 generates deterministic non-random appointment IDs when id is missing", () => {
			const rawAppointments = [
				{
					doctorId: "doc-1",
					startsAt: "2026-08-29T09:00:00.000Z",
					endsAt: "2026-08-29T10:00:00.000Z",
					patientId: "pat-100",
					patientFullName: "Тестов Тест Тестович",
				},
				{
					doctorId: "doc-1",
					startsAt: "2026-08-29T10:00:00.000Z",
					endsAt: "2026-08-29T11:00:00.000Z",
					patientId: "pat-101",
					patientFullName: "Второй Пациент",
				},
			];

			const adapted = adaptToDoctorShiftAppointments({
				appointments: rawAppointments,
				doctorId: "doc-1",
				shiftDateIso: "2026-08-29",
			});

			assert.equal(adapted.length, 2);
			assert.equal(adapted[0]?.id, "apt-doc-1-20260829-01");
			assert.equal(adapted[1]?.id, "apt-doc-1-20260829-02");
			assert.ok(!adapted[0]?.id.includes("NaN"));
			assert.ok(!adapted[0]?.id.includes("undefined"));
		});

		it("6.2 generates 6-digit SMS verification code using CSPRNG without Math.random", () => {
			const session = initiateBatchEmrSigning({
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов",
				doctorPhone: "+79265551234",
				appointmentIds: ["apt-shift-01"],
			});

			assert.match(session.secretCode, /^\d{6}$/);
			const codeNum = Number.parseInt(session.secretCode, 10);
			assert.ok(codeNum >= 100000 && codeNum <= 999999);
		});

		it("6.3 generates official doctor shift number according to clinical standards (СМ-YYYYMMDD-NN)", () => {
			const shiftNum1 = generateDoctorShiftNumber("2026-08-29", { sequenceNumber: 1 });
			assert.equal(shiftNum1, "СМ-20260829-01");

			const shiftNum2 = generateDoctorShiftNumber(new Date("2026-09-05T08:00:00Z"), { sequenceNumber: 5 });
			assert.equal(shiftNum2, "СМ-20260905-05");

			const custom = generateDoctorShiftNumber("2026-08-29", { customShiftNumber: "СМ-20260829-VIP" });
			assert.equal(custom, "СМ-20260829-VIP");
		});
	});

	describe("7. Honest Doctor Shift Worklog & SanPiN Sterilization (Mandate 8e)", () => {
		it("7.1 calculates honest clinical worklog, cabinet sterilization, and doctor earnings", () => {
			const worklog = calculateDoctorShiftWorklog({
				doctorId: "doc-1",
				shiftDateIso: "2026-08-29",
				appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
				plannedShiftHours: 6.0,
				defaultSterilizationMinutesPerVisit: 10,
				breaks: [
					{
						id: "brk-01",
						type: "doctor_meal",
						nameRu: "Обеденный перерыв",
						startsAtIso: "2026-08-29T13:30:00.000Z",
						endsAtIso: "2026-08-29T14:00:00.000Z",
						durationMinutes: 30,
					},
				],
			});

			assert.equal(worklog.doctorId, "doc-1");
			assert.equal(worklog.totalAppointmentsCount, 5);
			assert.equal(worklog.completedAppointmentsCount, 3);
			assert.equal(worklog.inChairAppointmentsCount, 1);
			assert.equal(worklog.waitingAppointmentsCount, 1);

			// Completed visits: 3 * 10 min = 30 min sterilization
			assert.equal(worklog.totalSterilizationMinutes, 30);
			// Explicit break: 30 min
			assert.equal(worklog.totalBreakMinutes, 30);

			// Planned shift: 6 hours = 360 min
			assert.equal(worklog.totalPlannedDurationMinutes, 360);
			assert.ok(worklog.totalActualWorkMinutes > 0);
			assert.ok(worklog.chairUtilizationPercent > 0 && worklog.chairUtilizationPercent <= 100);

			// Shift Number present
			assert.ok(worklog.shiftNumber.startsWith("СМ-20260829-"));

			// Financial exactness in integer kopecks
			assert.equal(worklog.earnings.grossRevenueKop, 6660000);
			assert.equal(worklog.earnings.totalEarnedDealKop, 1150000);
		});

		it("7.2 validates doctorShiftRecordSchema and doctorShiftBreakIntervalSchema", () => {
			const record = {
				id: "shift-001",
				shiftNumber: "СМ-20260829-01",
				doctorId: "doc-1",
				doctorFullName: "Д-р Смирнов Алексей Петрович",
				shiftDateIso: "2026-08-29",
				plannedStartsAtIso: "2026-08-29T09:00:00.000Z",
				plannedEndsAtIso: "2026-08-29T15:00:00.000Z",
				status: "in_progress" as const,
				breaks: [
					{
						id: "brk-01",
						type: "doctor_meal" as const,
						nameRu: "Обед",
						startsAtIso: "2026-08-29T13:00:00.000Z",
						endsAtIso: "2026-08-29T13:30:00.000Z",
						durationMinutes: 30,
					},
				],
			};

			assert.doesNotThrow(() => doctorShiftRecordSchema.parse(record));
		});
	});
});
