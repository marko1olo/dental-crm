/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Cockpit Engine Tests (Wave 21)
 *
 * 100% Comprehensive Unit Test Suite covering:
 * 1. Appointment Countdown Timer with exact threshold gradations:
 *    - normal (>15 min, emerald)
 *    - warning (5..15 min, amber)
 *    - critical (<5 min, rose)
 *    - overtime (slot expired, crimson)
 * 2. Statutory EMR Form 043/у Completeness Evaluation (0..100%):
 *    - Complaints, Anamnesis, Formula, ICD-10, Treatment Plan, Services, Signature.
 * 3. Patient Financial Balance in Integer Kopecks (Zero Float Drift).
 * 4. Assistant & Staff Pager Event Dispatcher (4 event types, state transitions).
 * 5. Cryptographic SHA-256 PEP Protocol (63-ФЗ) with Attempt Decrement.
 * 6. Doctor Shift Queue & Workspace Orchestration Engine (in-chair, next, unclosed EMR).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	appointmentTimerStatusSchema,
	appointmentTimerResultSchema,
	APPOINTMENT_TIMER_STATUS_META,
	emr043SectionKeySchema,
	EMR_043_SECTIONS_CONFIG,
	emr043CompletenessResultSchema,
	pagerEventTypeSchema,
	pagerUrgencySchema,
	pagerStatusSchema,
	PAGER_EVENT_TYPE_META,
	assistantPagerEventSchema,
	patientFinancialBalanceSchema,
	unclosedEmrCardSchema,
	calculateAppointmentTimer,
	evaluateEmr043Completeness,
	calculatePatientShiftBalance,
	createAssistantPagerEvent,
	acknowledgeAssistantPagerEvent,
	resolveAssistantPagerEvent,
	cancelAssistantPagerEvent,
	filterActivePagerEvents,
	generateBatchEmrProtocolHashSha256,
	initiateBatchEmrSigningSha256,
	verifyAndSignBatchEmrSha256,
	calculateDoctorShiftQueue,
	SAMPLE_COCKPIT_APPOINTMENTS,
	type AssistantPagerEvent,
	type Emr043CardEvaluationInput,
} from "../doctor/doctorShiftCockpitEngine.js";
import { maskDoctorPhoneNumber } from "../doctor-portal/doctorShiftEngine.js";

describe("Doctor Shift Cockpit Engine (Wave 21 / Doctor Workstation)", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. APPOINTMENT COUNTDOWN TIMER TESTS
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Appointment Countdown Timer Engine", () => {
		it("1.1 returns 'normal' status when remaining time is > 15 minutes", () => {
			const startsAtIso = "2026-08-30T10:00:00.000Z";
			const endsAtIso = "2026-08-30T11:00:00.000Z";
			const currentTimeIso = "2026-08-30T10:20:00.000Z"; // 40 min remaining

			const timer = calculateAppointmentTimer({
				startsAtIso,
				endsAtIso,
				currentTimeIso,
			});

			assert.equal(timer.status, "normal");
			assert.equal(timer.isOvertime, false);
			assert.equal(timer.remainingMinutes, 40);
			assert.equal(timer.remainingSeconds, 2400);
			assert.equal(timer.overtimeMinutes, 0);
			assert.equal(timer.overtimeSeconds, 0);
			assert.equal(timer.elapsedMinutes, 20);
			assert.equal(timer.totalSlotDurationMinutes, 60);
			assert.equal(timer.progressPercent, 33);
			assert.equal(timer.badgeColor, "emerald");
			assert.equal(timer.badgeColorHex, "#10b981");
			assert.equal(timer.labelRu, "В графике: 40 мин");
			assert.doesNotThrow(() => appointmentTimerResultSchema.parse(timer));
		});

		it("1.2 returns 'warning' status when remaining time is between 5 and 15 minutes", () => {
			const startsAtIso = "2026-08-30T10:00:00.000Z";
			const endsAtIso = "2026-08-30T11:00:00.000Z";
			const currentTimeIso = "2026-08-30T10:50:00.000Z"; // 10 min remaining

			const timer = calculateAppointmentTimer({
				startsAtIso,
				endsAtIso,
				currentTimeIso,
			});

			assert.equal(timer.status, "warning");
			assert.equal(timer.isOvertime, false);
			assert.equal(timer.remainingMinutes, 10);
			assert.equal(timer.remainingSeconds, 600);
			assert.equal(timer.badgeColor, "amber");
			assert.equal(timer.badgeColorHex, "#f59e0b");
			assert.equal(timer.labelRu, "Завершение: 10 мин");
			assert.equal(timer.progressPercent, 83);
		});

		it("1.3 handles exact 15 minute warning boundary condition", () => {
			const startsAtIso = "2026-08-30T10:00:00.000Z";
			const endsAtIso = "2026-08-30T11:00:00.000Z";
			const currentTimeIso = "2026-08-30T10:45:00.000Z"; // exactly 15:00 remaining

			const timer = calculateAppointmentTimer({
				startsAtIso,
				endsAtIso,
				currentTimeIso,
			});

			assert.equal(timer.status, "warning");
			assert.equal(timer.remainingMinutes, 15);
		});

		it("1.4 returns 'critical' status when remaining time is < 5 minutes", () => {
			const startsAtIso = "2026-08-30T10:00:00.000Z";
			const endsAtIso = "2026-08-30T11:00:00.000Z";
			const currentTimeIso = "2026-08-30T10:57:00.000Z"; // 3 min remaining

			const timer = calculateAppointmentTimer({
				startsAtIso,
				endsAtIso,
				currentTimeIso,
			});

			assert.equal(timer.status, "critical");
			assert.equal(timer.isOvertime, false);
			assert.equal(timer.remainingMinutes, 3);
			assert.equal(timer.remainingSeconds, 180);
			assert.equal(timer.badgeColor, "rose");
			assert.equal(timer.badgeColorHex, "#f43f5e");
			assert.equal(timer.labelRu, "Критично: 3 мин");
			assert.equal(timer.progressPercent, 95);
		});

		it("1.5 returns 'overtime' status when slot time has expired", () => {
			const startsAtIso = "2026-08-30T10:00:00.000Z";
			const endsAtIso = "2026-08-30T11:00:00.000Z";
			const currentTimeIso = "2026-08-30T11:12:30.000Z"; // 12 min 30 sec overtime

			const timer = calculateAppointmentTimer({
				startsAtIso,
				endsAtIso,
				currentTimeIso,
			});

			assert.equal(timer.status, "overtime");
			assert.equal(timer.isOvertime, true);
			assert.equal(timer.remainingMinutes, 0);
			assert.equal(timer.remainingSeconds, 0);
			assert.equal(timer.overtimeMinutes, 12);
			assert.equal(timer.overtimeSeconds, 750);
			assert.equal(timer.badgeColor, "crimson");
			assert.equal(timer.badgeColorHex, "#dc2626");
			assert.equal(timer.labelRu, "Задержка: +12 мин");
			assert.equal(timer.progressPercent, 100);
		});

		it("1.6 formats overtime seconds when under 1 minute delay", () => {
			const startsAtIso = "2026-08-30T10:00:00.000Z";
			const endsAtIso = "2026-08-30T11:00:00.000Z";
			const currentTimeIso = "2026-08-30T11:00:45.000Z"; // 45 sec overtime

			const timer = calculateAppointmentTimer({
				startsAtIso,
				endsAtIso,
				currentTimeIso,
			});

			assert.equal(timer.status, "overtime");
			assert.equal(timer.overtimeMinutes, 0);
			assert.equal(timer.overtimeSeconds, 45);
			assert.equal(timer.labelRu, "Задержка: +45 сек");
		});

		it("1.7 verifies all APPOINTMENT_TIMER_STATUS_META definitions", () => {
			for (const status of ["normal", "warning", "critical", "overtime"] as const) {
				const meta = APPOINTMENT_TIMER_STATUS_META[status];
				assert.ok(meta.labelRu.length > 0);
				assert.ok(meta.badgeColorHex.startsWith("#"));
				assert.ok(meta.descriptionRu.length > 0);
				assert.ok(meta.severityLevel >= 0);
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. EMR FORM 043/у COMPLETENESS EVALUATION TESTS
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Statutory EMR Form 043/у Completeness Evaluation", () => {
		it("2.1 returns 0% totalScore for completely empty outpatient card", () => {
			const result = evaluateEmr043Completeness({});

			assert.equal(result.totalScore, 0);
			assert.equal(result.readinessStatus, "incomplete");
			assert.equal(result.isReadyForSigning, false);
			assert.equal(result.isFullySigned, false);
			assert.equal(result.missingSectionsCount, 7);
			assert.equal(result.blockingIssuesRu.length, 6); // 6 mandatory clinical sections missing
			assert.ok(result.evaluationSummaryRu.includes("0%"));
			assert.doesNotThrow(() => emr043CompletenessResultSchema.parse(result));
		});

		it("2.2 evaluates all 7 sections independently with exact statutory weights", () => {
			const input: Emr043CardEvaluationInput = {
				chiefComplaint: "Острая ноющая боль в зубе 2.6 от холодного",
				historyOfPresentIllness: "Боль появилась 2 дня назад, усиливается в ночное время",
				allergologicalHistory: "Аллергических реакций на анестетики нет",
				diagnosisTooth: "26",
				diagnosisIcd10: "K04.0",
				treatmentDescription: "Механическая обработка 3 каналов, временное пломбирование Каласепт",
				services: [
					{
						id: "srv-1",
						code804n: "A16.07.030",
						nameRu: "Обработка каналов",
						category: "therapy",
						quantity: 1,
						unitPriceKop: 300000,
						totalCostKop: 300000,
						discountKop: 0,
						finalRevenueKop: 300000,
						directLabZtlCostKop: 0,
						directMaterialCostKop: 50000,
						commissionPercent: 25,
						earnedDoctorPayoutKop: 62500,
					},
				],
				emrCard043uStatus: "draft",
			};

			const result = evaluateEmr043Completeness(input);

			// 15 * 6 = 90% (all medical sections 1..6 complete, signature missing)
			assert.equal(result.totalScore, 90);
			assert.equal(result.readinessStatus, "ready_for_signing");
			assert.equal(result.isReadyForSigning, true);
			assert.equal(result.isFullySigned, false);
			assert.equal(result.missingSectionsCount, 1);
			assert.equal(result.blockingIssuesRu.length, 0);

			const sigSection = result.sections.find((s) => s.sectionId === "doctor_signature");
			assert.equal(sigSection?.isComplete, false);
			assert.equal(sigSection?.earnedScore, 0);
		});

		it("2.3 returns 100% and fully_signed status when signed with PEP stamp", () => {
			const input: Emr043CardEvaluationInput = {
				chiefComplaint: "Боль при накусывании на зуб 1.5",
				historyOfPresentIllness: "Зуб лечен 3 года назад, обострение 1 день",
				diagnosisTooth: "15",
				diagnosisIcd10: "K04.4",
				treatmentDescription: "Распломбировка корневого канала 1.5, ревизия верхушки",
				services: [
					{
						id: "srv-2",
						code804n: "A16.07.008",
						nameRu: "Пломбирование канала",
						category: "therapy",
						quantity: 1,
						unitPriceKop: 250000,
						totalCostKop: 250000,
						discountKop: 0,
						finalRevenueKop: 250000,
						directLabZtlCostKop: 0,
						directMaterialCostKop: 30000,
						commissionPercent: 25,
						earnedDoctorPayoutKop: 55000,
					},
				],
				emrCard043uStatus: "signed",
				emrSignedAtIso: "2026-08-30T11:00:00.000Z",
				emrPepProtocolHash: "RU-PEP-63FZ-ABCDEF0123456789ABCDEF0123456789",
			};

			const result = evaluateEmr043Completeness(input);

			assert.equal(result.totalScore, 100);
			assert.equal(result.readinessStatus, "fully_signed");
			assert.equal(result.isReadyForSigning, true);
			assert.equal(result.isFullySigned, true);
			assert.equal(result.missingSectionsCount, 0);
			assert.equal(result.blockingIssuesRu.length, 0);
			assert.ok(result.evaluationSummaryRu.includes("100%"));
		});

		it("2.4 validates ICD-10 stomatology codes correctly", () => {
			const validCodes = ["K02", "K02.0", "K02.1", "K04.0", "K05.3", "K08.1", "K00.3"];
			for (const code of validCodes) {
				const res = evaluateEmr043Completeness({ diagnosisIcd10: code });
				const icdSection = res.sections.find((s) => s.sectionId === "icd10_diagnosis");
				assert.equal(icdSection?.isComplete, true, `Expected valid ICD-10 for ${code}`);
			}

			const invalidResult = evaluateEmr043Completeness({ diagnosisIcd10: "" });
			const invalidSection = invalidResult.sections.find((s) => s.sectionId === "icd10_diagnosis");
			assert.equal(invalidSection?.isComplete, false);
		});

		it("2.5 verifies EMR_043_SECTIONS_CONFIG metadata definitions", () => {
			assert.equal(EMR_043_SECTIONS_CONFIG.length, 7);
			const totalWeight = EMR_043_SECTIONS_CONFIG.reduce((s, c) => s + c.weightPercent, 0);
			assert.equal(totalWeight, 100, "Sum of section weights must equal 100%");

			for (const config of EMR_043_SECTIONS_CONFIG) {
				assert.ok(config.nameRu.length > 0);
				assert.ok(config.statutoryBasisRu.length > 0);
				assert.ok(emr043SectionIdSchema.safeParse(config.sectionId).success);
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. PATIENT FINANCIAL BALANCE IN INTEGER KOPECKS TESTS
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Patient Financial Balance in Integer Kopecks", () => {
		it("3.1 calculates balance with positive advance deposit and zero debt", () => {
			// Advance deposit: 10,000.00 RUB (1,000,000 kop)
			// Today's services: 5,500.00 RUB (550,000 kop)
			// Paid today: 0 kop (to be paid from deposit)
			const balance = calculatePatientShiftBalance({
				patientId: "pat-1",
				depositBalanceKop: 1000000,
				todayServicesTotalKop: 550000,
				todayPaidTotalKop: 0,
			});

			assert.equal(balance.depositBalanceKop, 1000000);
			assert.equal(balance.todayServicesTotalKop, 550000);
			assert.equal(balance.todayPaidTotalKop, 0);
			assert.equal(balance.todayRemainingDueKop, 550000);
			assert.equal(balance.effectiveAvailableFundsKop, 1000000);
			assert.equal(balance.hasDebt, false);
			assert.equal(balance.debtAmountKop, 0);
			assert.equal(balance.canCoverTodayServices, true);
			assert.doesNotThrow(() => patientFinancialBalanceSchema.parse(balance));
		});

		it("3.2 calculates debt when services exceed available deposit", () => {
			// Deposit: 1,000.00 RUB (100,000 kop)
			// Services: 6,500.00 RUB (650,000 kop)
			const balance = calculatePatientShiftBalance({
				patientId: "pat-2",
				depositBalanceKop: 100000,
				todayServicesTotalKop: 650000,
				todayPaidTotalKop: 0,
			});

			assert.equal(balance.todayRemainingDueKop, 650000);
			assert.equal(balance.effectiveAvailableFundsKop, 100000);
			assert.equal(balance.hasDebt, true);
			assert.equal(balance.debtAmountKop, 550000); // 5,500.00 RUB debt
			assert.equal(balance.canCoverTodayServices, false);
		});

		it("3.3 aggregates shared family wallet funds with individual balance", () => {
			// Patient deposit: 500.00 RUB (50,000 kop)
			// Family wallet: 12,000.00 RUB (1,200,000 kop)
			// Services: 8,000.00 RUB (800,000 kop)
			const balance = calculatePatientShiftBalance({
				patientId: "pat-3",
				depositBalanceKop: 50000,
				todayServicesTotalKop: 800000,
				todayPaidTotalKop: 0,
				familyWalletBalanceKop: 1200000,
			});

			assert.equal(balance.effectiveAvailableFundsKop, 1250000);
			assert.equal(balance.hasDebt, false);
			assert.equal(balance.debtAmountKop, 0);
			assert.equal(balance.canCoverTodayServices, true);
		});

		it("3.4 formats negative debt balance properly with Russian typography", () => {
			const balance = calculatePatientShiftBalance({
				patientId: "pat-4",
				depositBalanceKop: -250000, // −2,500.00 RUB
				todayServicesTotalKop: 0,
				todayPaidTotalKop: 0,
			});

			assert.equal(balance.hasDebt, true);
			assert.equal(balance.debtAmountKop, 250000);
			assert.ok(balance.formattedDeposit.includes("2") && balance.formattedDeposit.includes("500"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. ASSISTANT & STAFF PAGER EVENT DISPATCHER TESTS
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Assistant & Staff Pager Event Engine", () => {
		it("4.1 creates pager events for all 4 clinical event types", () => {
			const types = [
				"assistant_needed",
				"sterilization_needed",
				"emergency_doctor",
				"reception_call",
			] as const;

			for (const eventType of types) {
				const event = createAssistantPagerEvent({
					eventType,
					doctorId: "doc-1",
					doctorFullName: "Д-р Смирнов А.П.",
					cabinetNumber: "Кабинет 3",
					chairId: "chair-1",
					notes: "Срочно",
				});

				assert.equal(event.eventType, eventType);
				assert.equal(event.doctorId, "doc-1");
				assert.equal(event.cabinetNumber, "Кабинет 3");
				assert.equal(event.status, "active");
				assert.ok(event.id.startsWith(`pager-${eventType}-`));
				assert.doesNotThrow(() => assistantPagerEventSchema.parse(event));
			}
		});

		it("4.2 acknowledges active pager event with responder details", () => {
			const event = createAssistantPagerEvent({
				eventType: "assistant_needed",
				doctorId: "doc-1",
				doctorFullName: "Д-р Смирнов А.П.",
				cabinetNumber: "Кабинет 1",
			});

			const ackEvent = acknowledgeAssistantPagerEvent(event, {
				responderUserId: "user-asst-10",
				responderFullName: "Медсестра Иванова М.В.",
				acknowledgedAtIso: "2026-08-30T10:15:30.000Z",
			});

			assert.equal(ackEvent.status, "acknowledged");
			assert.equal(ackEvent.acknowledgedByUserId, "user-asst-10");
			assert.equal(ackEvent.acknowledgedByName, "Медсестра Иванова М.В.");
			assert.equal(ackEvent.acknowledgedAtIso, "2026-08-30T10:15:30.000Z");
		});

		it("4.3 resolves active or acknowledged pager event", () => {
			const event = createAssistantPagerEvent({
				eventType: "sterilization_needed",
				doctorId: "doc-1",
				doctorFullName: "Д-р Смирнов А.П.",
				cabinetNumber: "Кабинет 2",
			});

			const resolvedEvent = resolveAssistantPagerEvent(event, {
				resolvedByUserId: "user-san-5",
				resolvedAtIso: "2026-08-30T10:20:00.000Z",
			});

			assert.equal(resolvedEvent.status, "resolved");
			assert.equal(resolvedEvent.resolvedByUserId, "user-san-5");
			assert.equal(resolvedEvent.resolvedAtIso, "2026-08-30T10:20:00.000Z");
		});

		it("4.4 cancels pager event cleanly", () => {
			const event = createAssistantPagerEvent({
				eventType: "reception_call",
				doctorId: "doc-1",
				doctorFullName: "Д-р Смирнов А.П.",
				cabinetNumber: "Кабинет 1",
			});

			const cancelled = cancelAssistantPagerEvent(event);
			assert.equal(cancelled.status, "cancelled");
		});

		it("4.5 filters active pager events for doctor workstation", () => {
			const ev1 = createAssistantPagerEvent({
				eventType: "assistant_needed",
				doctorId: "doc-1",
				doctorFullName: "Д-р Смирнов А.П.",
				cabinetNumber: "Каб 1",
			});
			const ev2 = resolveAssistantPagerEvent(
				createAssistantPagerEvent({
					eventType: "sterilization_needed",
					doctorId: "doc-1",
					doctorFullName: "Д-р Смирнов А.П.",
					cabinetNumber: "Каб 1",
				}),
				{ resolvedByUserId: "user-1" },
			);
			const ev3 = createAssistantPagerEvent({
				eventType: "emergency_doctor",
				doctorId: "doc-2",
				doctorFullName: "Д-р Ковалев И.Д.",
				cabinetNumber: "Каб 2",
			});

			const activeDoc1 = filterActivePagerEvents([ev1, ev2, ev3], "doc-1");
			assert.equal(activeDoc1.length, 1);
			assert.equal(activeDoc1[0]?.id, ev1.id);

			const allActive = filterActivePagerEvents([ev1, ev2, ev3]);
			assert.equal(allActive.length, 2);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. SHA-256 BATCH PEP PROTOCOL & ATTEMPT DECREMENT TESTS
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Cryptographic SHA-256 PEP Protocol (63-ФЗ)", () => {
		it("5.1 generates deterministic 32-hex SHA-256 protocol hash stamp", () => {
			const hash1 = generateBatchEmrProtocolHashSha256(
				["apt-cockpit-01", "apt-cockpit-02"],
				"doc-shift-1",
				"2026-08-30T10:00:00.000Z",
			);
			const hash2 = generateBatchEmrProtocolHashSha256(
				["apt-cockpit-02", "apt-cockpit-01"], // different order
				"doc-shift-1",
				"2026-08-30T10:00:00.000Z",
			);

			assert.equal(hash1, hash2, "Sorted IDs must yield deterministic hash");
			assert.ok(hash1.startsWith("RU-PEP-63FZ-"));
			assert.equal(hash1.length, 44); // "RU-PEP-63FZ-" (12) + 32 hex = 44 chars
		});

		it("5.2 masks doctor phone number securely for SMS delivery", () => {
			assert.equal(maskDoctorPhoneNumber("+7 (926) 111-22-33"), "+7 (926) ***-**-33");
			assert.equal(maskDoctorPhoneNumber("89164445566"), "+7 (916) ***-**-66");
			assert.equal(maskDoctorPhoneNumber("123"), "+7 (***) ***-**-**");
		});

		it("5.3 initiates signing session with SHA-256 token and 3 attempts", () => {
			const session = initiateBatchEmrSigningSha256({
				doctorId: "doc-shift-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorPhone: "+7 (926) 111-22-33",
				appointmentIds: ["apt-cockpit-01"],
				fixedSecretCode: "654321",
			});

			assert.equal(session.doctorId, "doc-shift-1");
			assert.equal(session.secretCode, "654321");
			assert.equal(session.attemptsRemaining, 3);
			assert.ok(session.batchHash.startsWith("RU-PEP-63FZ-"));
		});

		it("5.4 verifies correct SMS code and signs all appointments in batch", () => {
			const session = initiateBatchEmrSigningSha256({
				doctorId: "doc-shift-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorPhone: "+7 (926) 111-22-33",
				appointmentIds: ["apt-cockpit-02"],
				fixedSecretCode: "192837",
				currentTimeIso: "2026-08-30T11:00:00.000Z",
			});

			const result = verifyAndSignBatchEmrSha256({
				session,
				enteredCode: "192837",
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorSnils: "123-456-789 64",
				signTimestampIso: "2026-08-30T11:02:00.000Z",
			});

			assert.equal(result.success, true);
			assert.equal(result.signedCount, 1);
			assert.deepEqual(result.signedAppointmentIds, ["apt-cockpit-02"]);
			assert.equal(result.updatedSession.isVerified, true);

			const signedApt = result.updatedAppointments.find((a) => a.id === "apt-cockpit-02");
			assert.equal(signedApt?.emrCard043uStatus, "signed");
			assert.equal(signedApt?.emrSignedAtIso, "2026-08-30T11:02:00.000Z");
			assert.ok(signedApt?.emrPepProtocolHash?.startsWith("RU-PEP-63FZ-"));
			assert.equal(signedApt?.emrSignerInfo?.snils, "123-456-789 64");
		});

		it("5.5 decrements attemptsRemaining on incorrect code and locks on 0", () => {
			let session = initiateBatchEmrSigningSha256({
				doctorId: "doc-shift-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorPhone: "+7 (926) 111-22-33",
				appointmentIds: ["apt-cockpit-02"],
				fixedSecretCode: "888888",
			});

			// Attempt 1: 3 -> 2
			let res = verifyAndSignBatchEmrSha256({
				session,
				enteredCode: "000000",
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorName: "Д-р Смирнов",
			});
			assert.equal(res.success, false);
			assert.equal(res.updatedSession.attemptsRemaining, 2);
			assert.ok(res.messageRu.includes("Осталось попыток: 2"));

			// Attempt 2: 2 -> 1
			session = res.updatedSession;
			res = verifyAndSignBatchEmrSha256({
				session,
				enteredCode: "000000",
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorName: "Д-р Смирнов",
			});
			assert.equal(res.success, false);
			assert.equal(res.updatedSession.attemptsRemaining, 1);
			assert.ok(res.messageRu.includes("Осталось попыток: 1"));

			// Attempt 3: 1 -> 0 (locked)
			session = res.updatedSession;
			res = verifyAndSignBatchEmrSha256({
				session,
				enteredCode: "000000",
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorName: "Д-р Смирнов",
			});
			assert.equal(res.success, false);
			assert.equal(res.updatedSession.attemptsRemaining, 0);
			assert.equal(res.updatedSession.isExpired, true);

			// Attempt 4 on locked session
			session = res.updatedSession;
			res = verifyAndSignBatchEmrSha256({
				session,
				enteredCode: "888888", // even with correct code, locked
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorName: "Д-р Смирнов",
			});
			assert.equal(res.success, false);
			assert.ok(res.messageRu.includes("Превышено максимальное количество попыток"));
		});

		it("5.6 rejects expired signing session", () => {
			const session = initiateBatchEmrSigningSha256({
				doctorId: "doc-shift-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorPhone: "+7 (926) 111-22-33",
				appointmentIds: ["apt-cockpit-02"],
				fixedSecretCode: "123456",
				validityDurationSeconds: 10,
				currentTimeIso: "2026-08-30T10:00:00.000Z",
			});

			const res = verifyAndSignBatchEmrSha256({
				session,
				enteredCode: "123456",
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorName: "Д-р Смирнов",
				signTimestampIso: "2026-08-30T10:30:00.000Z", // 30 min later
			});

			assert.equal(res.success, false);
			assert.ok(res.messageRu.includes("Срок действия СМС-кода истек"));
			assert.equal(res.updatedSession.isExpired, true);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. DOCTOR SHIFT QUEUE ORCHESTRATION ENGINE TESTS
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Doctor Shift Queue & Workspace Orchestration Engine", () => {
		it("6.1 calculates complete shift queue, current in-chair patient, and next waiting patient", () => {
			const result = calculateDoctorShiftQueue({
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorId: "doc-shift-1",
				shiftDateIso: "2026-08-30",
				currentTimeIso: "2026-08-30T11:20:00.000Z", // 10 min remaining for in_chair (ends at 11:30)
				patientBalances: {
					"pat-202": { depositBalanceKop: 1500000, familyWalletBalanceKop: 0 },
					"pat-203": { depositBalanceKop: 200000, familyWalletBalanceKop: 500000 },
				},
			});

			assert.equal(result.doctorId, "doc-shift-1");
			assert.equal(result.shiftDateIso, "2026-08-30");

			// Current Patient (apt-cockpit-02, in_chair)
			assert.ok(result.currentPatient !== null);
			assert.equal(result.currentPatient?.appointment.id, "apt-cockpit-02");
			assert.equal(result.currentPatient?.timer.status, "warning"); // 10 min left
			assert.equal(result.currentPatient?.financialBalance.depositBalanceKop, 1500000);

			// Next Patient (apt-cockpit-03, waiting)
			assert.ok(result.nextPatient !== null);
			assert.equal(result.nextPatient?.appointment.id, "apt-cockpit-03");
			assert.equal(result.nextPatient?.isWaitingInHall, true);
			assert.equal(result.nextPatient?.financialBalance.familyWalletBalanceKop, 500000);

			// Queues
			assert.equal(result.waitingQueue.length, 2);
			assert.equal(result.upcomingAppointments.length, 0);
			assert.equal(result.completedAppointments.length, 1);

			// Operational Metrics
			assert.equal(result.metrics.totalAppointments, 4);
			assert.equal(result.metrics.completedCount, 1);
			assert.equal(result.metrics.inChairCount, 1);
			assert.equal(result.metrics.waitingCount, 2);
			assert.equal(result.metrics.cancelledCount, 0);

			// Gross revenue: apt-01 (5500 RUB = 550000 kop) + apt-02 (9000 RUB = 900000 kop) = 1450000 kop
			assert.equal(result.metrics.totalGrossRevenueKop, 1450000);
			// Earned payout: apt-01 (125000 kop) + apt-02 (187500 kop) = 312500 kop
			assert.equal(result.metrics.totalEarnedPayoutKop, 312500);
		});

		it("6.2 tracks unclosed EMR cards (043/у) and calculates statutory deadlines", () => {
			const result = calculateDoctorShiftQueue({
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorId: "doc-shift-1",
				shiftDateIso: "2026-08-30",
				currentTimeIso: "2026-08-30T12:00:00.000Z",
				statutoryEmrDeadlineHours: 24,
			});

			// apt-cockpit-01 is completed & signed -> NOT unclosed
			// apt-cockpit-02 is in_chair with draft -> unclosed
			assert.equal(result.unclosedEmrCards.length, 1);
			const unclosed = result.unclosedEmrCards[0]!;
			assert.equal(unclosed.appointmentId, "apt-cockpit-02");
			assert.equal(unclosed.patientFullName, "Соколов Михаил Юрьевич");
			assert.equal(unclosed.isOverdue, false);
			assert.ok(unclosed.minutesUntilDeadline > 0);
			assert.doesNotThrow(() => unclosedEmrCardSchema.parse(unclosed));
		});

		it("6.3 flags overdue unclosed EMR cards when past 24-hour statutory deadline", () => {
			const expiredApt = {
				...SAMPLE_COCKPIT_APPOINTMENTS[1]!,
				status: "completed" as const,
				emrCard043uStatus: "pending_signature" as const,
				startsAtIso: "2026-08-25T09:00:00.000Z",
				endsAtIso: "2026-08-25T10:00:00.000Z", // 5 days ago
			};

			const result = calculateDoctorShiftQueue({
				appointments: [expiredApt],
				doctorId: "doc-shift-1",
				shiftDateIso: "2026-08-25",
				currentTimeIso: "2026-08-30T12:00:00.000Z",
				statutoryEmrDeadlineHours: 24,
			});

			assert.equal(result.unclosedEmrCards.length, 1);
			const unclosed = result.unclosedEmrCards[0]!;
			assert.equal(unclosed.isOverdue, true);
			assert.equal(unclosed.urgency, "overdue");
			assert.ok(unclosed.minutesUntilDeadline < 0);
			assert.equal(result.metrics.overdueCardsCount, 1);
		});

		it("6.4 isolates appointments for non-existent doctor cleanly", () => {
			const result = calculateDoctorShiftQueue({
				appointments: SAMPLE_COCKPIT_APPOINTMENTS,
				doctorId: "nonexistent-doc",
				shiftDateIso: "2026-08-30",
			});

			assert.equal(result.currentPatient, null);
			assert.equal(result.nextPatient, null);
			assert.equal(result.waitingQueue.length, 0);
			assert.equal(result.metrics.totalAppointments, 0);
			assert.equal(result.metrics.totalGrossRevenueKop, 0);
		});
	});
});
