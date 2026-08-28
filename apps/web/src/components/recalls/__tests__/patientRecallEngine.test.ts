/**
 * 100% Comprehensive Unit Test Suite for Patient Recall & Prophylaxis Engine
 * (DOMAIN: RECALLS)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	RECALL_CYCLE_CATALOG,
	addCalendarMonthsSafe,
	addDaysSafe,
	addWeeksSafe,
	calculateCohortRetention,
	calculateDaysOverdue,
	calculateHygieneRecallDate,
	calculateImplantRecallMilestones,
	calculateOrthoRecallDate,
	calculatePediatricRecallDate,
	calculateRecallMetrics,
	calculateRecallProfile,
	evaluateClinicalCycleSuggestion,
	extractFirstName,
	filterAndSortRecallCandidates,
	formatIsoDateOnly,
	generate1ClickBookingLink,
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	interpolateRecallTemplate,
	resolveUrgencyStatus,
	sanitizePhoneNumber,
	type PatientRecallRecord,
	type RecallCycleType,
} from "../patientRecallEngine";

describe("Patient Recall Engine - Clinical Interval Calculations", () => {
	it("1. Routine Hygiene: 6 months standard and 3-4 months for periodontitis", () => {
		// Standard hygiene (6 months)
		const standard = calculateHygieneRecallDate("2026-02-15", false);
		assert.equal(standard.intervalMonths, 6);
		assert.equal(standard.formattedDueDate, "2026-08-15");
		assert.equal(standard.cycleType, "standard_prophylaxis");

		// Periodontitis maintenance (3-4 months, default 3)
		const perio = calculateHygieneRecallDate("2026-05-10", true);
		assert.equal(perio.intervalMonths, 3);
		assert.equal(perio.formattedDueDate, "2026-08-10");
		assert.equal(perio.cycleType, "periodontal_maintenance");

		// Custom 4 months periodontitis override
		const perio4m = calculateHygieneRecallDate("2026-04-10", true, 4);
		assert.equal(perio4m.intervalMonths, 4);
		assert.equal(perio4m.formattedDueDate, "2026-08-10");
	});

	it("2. Dental Implant Osteointegration Milestones (1, 3, 6, 12 months)", () => {
		const surgeryDate = "2026-05-15";

		// Reference date is 2 weeks post-surgery: next milestone is month 1
		const earlyPostOp = calculateImplantRecallMilestones(surgeryDate, "2026-05-30");
		assert.equal(earlyPostOp.nextMilestoneMonth, 1);
		assert.equal(earlyPostOp.formattedNextDueDate, "2026-06-15");
		assert.equal(earlyPostOp.milestones.length, 4);
		assert.equal(earlyPostOp.milestones[0]?.month, 1);
		assert.equal(earlyPostOp.milestones[0]?.formattedDueDate, "2026-06-15");
		assert.equal(earlyPostOp.milestones[1]?.month, 3);
		assert.equal(earlyPostOp.milestones[1]?.formattedDueDate, "2026-08-15");
		assert.equal(earlyPostOp.milestones[2]?.month, 6);
		assert.equal(earlyPostOp.milestones[2]?.formattedDueDate, "2026-11-15");
		assert.equal(earlyPostOp.milestones[3]?.month, 12);
		assert.equal(earlyPostOp.milestones[3]?.formattedDueDate, "2027-05-15");

		// Reference date is 2 months post-surgery: month 1 is passed, next milestone is month 3
		const at2m = calculateImplantRecallMilestones(surgeryDate, "2026-07-20");
		assert.equal(at2m.nextMilestoneMonth, 3);
		assert.equal(at2m.formattedNextDueDate, "2026-08-15");
		assert.equal(at2m.milestones[0]?.isPassed, true);
		assert.equal(at2m.milestones[1]?.isPassed, false);

		// Reference date is 8 months post-surgery: next milestone is month 12
		const at8m = calculateImplantRecallMilestones(surgeryDate, "2027-01-20");
		assert.equal(at8m.nextMilestoneMonth, 12);
		assert.equal(at8m.formattedNextDueDate, "2027-05-15");
	});

	it("3. Orthodontic Control: Braces 4 weeks (28 days) and Aligners 6-8 weeks", () => {
		const lastAdjustment = "2026-08-01";

		// Braces: 4 weeks (28 days)
		const braces = calculateOrthoRecallDate(lastAdjustment, "braces");
		assert.equal(braces.cycleType, "orthodontic_braces");
		assert.equal(braces.formattedDueDate, "2026-08-29");
		assert.match(braces.intervalDescription, /4 нед/);

		// Custom 3 weeks braces activation
		const braces3w = calculateOrthoRecallDate(lastAdjustment, "braces", 3);
		assert.equal(braces3w.formattedDueDate, "2026-08-22");

		// Aligners: 6 weeks (42 days)
		const aligners = calculateOrthoRecallDate(lastAdjustment, "aligners");
		assert.equal(aligners.cycleType, "orthodontic_aligners");
		assert.equal(aligners.formattedDueDate, "2026-09-12"); // 1 Aug + 42 days = 12 Sept

		// Aligners: 8 weeks (56 days)
		const aligners8w = calculateOrthoRecallDate(lastAdjustment, "aligners", 8);
		assert.equal(aligners8w.formattedDueDate, "2026-09-26");

		// Retention: 3 months
		const retention = calculateOrthoRecallDate(lastAdjustment, "retainer");
		assert.equal(retention.cycleType, "orthodontic_retention");
		assert.equal(retention.formattedDueDate, "2026-11-01");
	});

	it("4. Pediatric Fluoridation and Fissure Sealing (3-6 months)", () => {
		// Pediatric high risk: 3 months
		const ped3m = calculatePediatricRecallDate("2026-05-12", true);
		assert.equal(ped3m.intervalMonths, 3);
		assert.equal(ped3m.formattedDueDate, "2026-08-12");
		assert.equal(ped3m.cycleType, "pediatric_fluoridation");

		// Pediatric standard: 6 months
		const ped6m = calculatePediatricRecallDate("2026-05-12", false);
		assert.equal(ped6m.intervalMonths, 6);
		assert.equal(ped6m.formattedDueDate, "2026-11-12");
	});
});

describe("Patient Recall Engine - Safe Calendar Math & Date Arithmetic", () => {
	it("handles month overflows (31 August -> 28 February, 31 May -> 30 September)", () => {
		const aug31 = new Date(2026, 7, 31);
		const plus6m = addCalendarMonthsSafe(aug31, 6);
		assert.equal(plus6m.getFullYear(), 2027);
		assert.equal(plus6m.getMonth(), 1); // Feb
		assert.equal(plus6m.getDate(), 28);

		const may31 = new Date(2026, 4, 31);
		const plus4m = addCalendarMonthsSafe(may31, 4);
		assert.equal(plus4m.getFullYear(), 2026);
		assert.equal(plus4m.getMonth(), 8); // Sep
		assert.equal(plus4m.getDate(), 30);
	});

	it("handles leap year February 29th properly", () => {
		const leapJan31 = new Date(2028, 0, 31);
		const plus1m = addCalendarMonthsSafe(leapJan31, 1);
		assert.equal(plus1m.getFullYear(), 2028);
		assert.equal(plus1m.getMonth(), 1); // Feb
		assert.equal(plus1m.getDate(), 29);
	});

	it("adds weeks and days correctly", () => {
		const d = new Date(2026, 7, 1); // 1 Aug 2026
		const plus4w = addWeeksSafe(d, 4);
		assert.equal(formatIsoDateOnly(plus4w), "2026-08-29");

		const plus10d = addDaysSafe(d, 10);
		assert.equal(formatIsoDateOnly(plus10d), "2026-08-11");
	});
});

describe("Patient Recall Engine - Overdue Days & Urgency Stratification", () => {
	it("calculates overdue days difference precisely", () => {
		assert.equal(calculateDaysOverdue("2026-08-10", "2026-08-25"), 15);
		assert.equal(calculateDaysOverdue("2026-08-25", "2026-08-10"), -15);
		assert.equal(calculateDaysOverdue("2026-08-10", "2026-08-10"), 0);
	});

	it("resolves urgency statuses with clinical rigor", () => {
		const due = "2026-08-10";

		// Completed override
		assert.equal(resolveUrgencyStatus(due, "2026-08-25", true), "completed");

		// Upcoming (future date)
		assert.equal(resolveUrgencyStatus("2026-09-10", "2026-08-25"), "upcoming");

		// Due now (0 to 29 days overdue)
		assert.equal(resolveUrgencyStatus(due, "2026-08-10"), "due_now"); // 0 days
		assert.equal(resolveUrgencyStatus(due, "2026-08-25"), "due_now"); // 15 days
		assert.equal(resolveUrgencyStatus(due, "2026-09-08"), "due_now"); // 29 days

		// Overdue 30 (30 to 89 days)
		assert.equal(resolveUrgencyStatus(due, "2026-09-15"), "overdue_30"); // 36 days
		assert.equal(resolveUrgencyStatus(due, "2026-11-05"), "overdue_30"); // 87 days

		// Overdue 90 (>= 90 days)
		assert.equal(resolveUrgencyStatus(due, "2026-11-15"), "overdue_90"); // 97 days
	});

	it("calculates full recall profile for braces", () => {
		const profile = calculateRecallProfile({
			lastVisitDate: "2026-08-01",
			cycleType: "orthodontic_braces",
			referenceDate: "2026-08-29",
		});
		assert.equal(profile.formattedDueDate, "2026-08-29");
		assert.equal(profile.daysOverdue, 0);
		assert.equal(profile.urgencyStatus, "due_now");
		assert.equal(profile.intervalDescription, "4 нед.");
	});
});

describe("Patient Recall Engine - Clinical Cycle Auto-Classification", () => {
	it("prioritizes periodontal maintenance when pocket >= 4mm or BOP present", () => {
		const perio = evaluateClinicalCycleSuggestion({
			maxPocketDepthMm: 5,
			hasBleedingOnProbing: true,
		});
		assert.equal(perio.suggestedCycle, "periodontal_maintenance");
		assert.equal(perio.recommendedIntervalValue, 3);
	});

	it("suggests implant monitoring for implant carriers", () => {
		const implant = evaluateClinicalCycleSuggestion({
			hasImplants: true,
			monthsSinceImplantSurgery: 2,
		});
		assert.equal(implant.suggestedCycle, "implant_monitoring");
		assert.equal(implant.recommendedIntervalValue, 3);
	});

	it("suggests braces vs aligners based on orthodontic appliances", () => {
		const braces = evaluateClinicalCycleSuggestion({ hasBraces: true });
		assert.equal(braces.suggestedCycle, "orthodontic_braces");
		assert.equal(braces.intervalUnit, "weeks");
		assert.equal(braces.recommendedIntervalValue, 4);

		const aligners = evaluateClinicalCycleSuggestion({ hasAligners: true });
		assert.equal(aligners.suggestedCycle, "orthodontic_aligners");
		assert.equal(aligners.intervalUnit, "weeks");
		assert.equal(aligners.recommendedIntervalValue, 6);
	});

	it("suggests pediatric fluoridation for children under 14", () => {
		const ped = evaluateClinicalCycleSuggestion({ isChildUnder14: true });
		assert.equal(ped.suggestedCycle, "pediatric_fluoridation");
		assert.equal(ped.recommendedIntervalValue, 3);
	});

	it("suggests high caries risk for patients with active caries", () => {
		const caries = evaluateClinicalCycleSuggestion({ hasDeepCaries: true, decayedTeethCount: 4 });
		assert.equal(caries.suggestedCycle, "caries_high_risk");
		assert.equal(caries.recommendedIntervalValue, 3);
	});
});

describe("Patient Recall Engine - Personalized Messaging Generator", () => {
	const sampleRecord: PatientRecallRecord = {
		id: "r1",
		patientId: "p101",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (916) 123-45-67",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2026-02-15",
		dueDate: "2026-08-15",
		daysOverdue: 13,
		urgencyStatus: "due_now",
		status: "due_now",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		historicalRevenueRub: 35000,
	};

	it("extracts first name and sanitizes phone numbers reliably", () => {
		assert.equal(extractFirstName("Иванов Иван Иванович"), "Иван");
		assert.equal(extractFirstName("Смирнова Елена"), "Елена");
		assert.equal(extractFirstName("Петров"), "Петров");
		assert.equal(extractFirstName(""), "Пациент");

		assert.equal(sanitizePhoneNumber("+7 (916) 123-45-67"), "79161234567");
		assert.equal(sanitizePhoneNumber("8 (925) 987-65-43"), "79259876543");
	});

	it("generates 1-click booking link with tracking and prefilled parameters", () => {
		const link = generate1ClickBookingLink({
			baseUrl: "https://dente.ru",
			patientId: "p101",
			doctorId: "doc-1",
			cycleType: "standard_prophylaxis",
			source: "whatsapp",
		});
		assert.ok(link.startsWith("https://dente.ru/booking?"));
		assert.ok(link.includes("patient_id=p101"));
		assert.ok(link.includes("doctor_id=doc-1"));
		assert.ok(link.includes("recall_cycle=standard_prophylaxis"));
		assert.ok(link.includes("source=whatsapp"));
	});

	it("generates WhatsApp message with doctor, clinic and last visit date", () => {
		const msg = generateWhatsAppRecallMessage(sampleRecord, { clinicName: "DENTE VIP" });
		assert.match(msg, /Здравствуйте, Иван!/);
		assert.match(msg, /DENTE VIP/);
		assert.match(msg, /Д-р Кузнецова Е\.В\./);
		assert.match(msg, /2026-02-15/);
		assert.match(msg, /booking\?patient_id=p101/);
	});

	it("generates SMS message concisely", () => {
		const sms = generateSmsRecallMessage(sampleRecord, { clinicName: "DENTE" });
		assert.match(sms, /Иван, прошло 6 мес с визита в DENTE/);
		assert.match(sms, /booking\?patient_id=p101/);
	});

	it("generates Telegram message", () => {
		const tg = generateTelegramRecallMessage(sampleRecord, { clinicName: "DENTE" });
		assert.match(tg, /Здравствуйте, Иван!/);
	});
});

describe("Patient Recall Engine - Cohort Retention & LTV Metrics", () => {
	const testCandidates: PatientRecallRecord[] = [
		{
			id: "1",
			patientId: "p1",
			fullName: "Иванов И.И.",
			phone: "+79161112233",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-01-10",
			dueDate: "2026-07-10",
			daysOverdue: 49,
			urgencyStatus: "overdue_30",
			status: "scheduled",
			historicalRevenueRub: 20000,
		},
		{
			id: "2",
			patientId: "p2",
			fullName: "Петров П.П.",
			phone: "+79162223344",
			cycleType: "periodontal_maintenance",
			lastVisitDate: "2026-01-15",
			dueDate: "2026-04-15",
			daysOverdue: 135,
			urgencyStatus: "overdue_90",
			status: "completed",
			historicalRevenueRub: 40000,
		},
		{
			id: "3",
			patientId: "p3",
			fullName: "Сидоров С.С.",
			phone: "+79163334455",
			cycleType: "caries_high_risk",
			lastVisitDate: "2026-02-10",
			dueDate: "2026-05-10",
			daysOverdue: 110,
			urgencyStatus: "overdue_90",
			status: "declined",
			historicalRevenueRub: 15000,
		},
		{
			id: "4",
			patientId: "p4",
			fullName: "Кузнецов К.К.",
			phone: "+79164445566",
			cycleType: "orthodontic_braces",
			lastVisitDate: "2026-08-01",
			dueDate: "2026-08-29",
			daysOverdue: -1,
			urgencyStatus: "upcoming",
			status: "due_now",
			historicalRevenueRub: 120000,
		},
	];

	it("computes overall metrics and LTV accurately", () => {
		const metrics = calculateRecallMetrics(testCandidates, 6500);
		assert.equal(metrics.totalCandidates, 4);
		assert.equal(metrics.upcomingCount, 1);
		assert.equal(metrics.dueNowCount, 0);
		assert.equal(metrics.overdue30Count, 1);
		assert.equal(metrics.overdue90Count, 2);
		assert.equal(metrics.scheduledCount, 1);
		assert.equal(metrics.completedCount, 1);
		assert.equal(metrics.declinedCount, 1);

		// Conversion: (1 scheduled + 1 completed) / 4 total = 50%
		assert.equal(metrics.conversionRatePercent, 50);

		// Retention: 1 completed / (4 total - 1 upcoming = 3 due) = 33.3%
		assert.equal(metrics.retentionRatePercent, 33.3);

		// Total historical Ltv = 20000 + 40000 + 15000 + 120000 = 195000
		assert.equal(metrics.totalHistoricalLtvRub, 195000);
		// Average LTV for completed patient (1) = 195000
		assert.equal(metrics.averageRecallLtvRub, 195000);
	});

	it("calculates monthly cohorts with individual retention & conversion rates", () => {
		const report = calculateCohortRetention(testCandidates, { grouping: "month", defaultAverageCheckRub: 6500 });
		assert.ok(report.cohorts.length >= 2);

		const janCohort = report.cohorts.find((c) => c.cohortKey === "2026-01");
		assert.ok(janCohort);
		assert.equal(janCohort.totalPatients, 2);
		assert.equal(janCohort.scheduledCount, 1);
		assert.equal(janCohort.completedCount, 1);
		assert.equal(janCohort.retentionRatePercent, 50); // 1 completed / 2 due = 50%
		assert.equal(janCohort.conversionRatePercent, 100); // 2 / 2 = 100%
	});

	it("calculates quarterly cohorts", () => {
		const qReport = calculateCohortRetention(testCandidates, { grouping: "quarter", defaultAverageCheckRub: 6500 });
		const q1Cohort = qReport.cohorts.find((c) => c.cohortKey === "2026-Q1");
		assert.ok(q1Cohort);
		assert.equal(q1Cohort.totalPatients, 3); // Jan + Feb
	});
});

describe("Patient Recall Engine - Filtering and Search", () => {
	const list: PatientRecallRecord[] = [
		{
			id: "1",
			patientId: "p1",
			fullName: "Алексеев Алексей",
			phone: "+7 (916) 123-45-67",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-02-10",
			dueDate: "2026-08-10",
			daysOverdue: 18,
			urgencyStatus: "due_now",
			status: "due_now",
			attendingDoctorName: "Д-р Кузнецова",
		},
		{
			id: "2",
			patientId: "p2",
			fullName: "Борисов Борис",
			phone: "+7 (925) 987-65-43",
			cycleType: "periodontal_maintenance",
			lastVisitDate: "2026-05-10",
			dueDate: "2026-08-10",
			daysOverdue: 18,
			urgencyStatus: "due_now",
			status: "invited",
			attendingDoctorName: "Д-р Морозов",
		},
	];

	it("filters by status (due_now vs invited)", () => {
		const dueNowList = filterAndSortRecallCandidates(list, { status: "due_now" });
		assert.equal(dueNowList.length, 1);
		assert.equal(dueNowList[0]?.fullName, "Алексеев Алексей");

		const invitedList = filterAndSortRecallCandidates(list, { status: "invited" });
		assert.equal(invitedList.length, 1);
		assert.equal(invitedList[0]?.fullName, "Борисов Борис");
	});

	it("filters by search query across names, phones and doctors", () => {
		const searchName = filterAndSortRecallCandidates(list, { searchQuery: "Борис" });
		assert.equal(searchName.length, 1);
		assert.equal(searchName[0]?.fullName, "Борисов Борис");

		const searchPhone = filterAndSortRecallCandidates(list, { searchQuery: "9876543" });
		assert.equal(searchPhone.length, 1);
		assert.equal(searchPhone[0]?.fullName, "Борисов Борис");

		const searchDoc = filterAndSortRecallCandidates(list, { searchQuery: "Кузнецова" });
		assert.equal(searchDoc.length, 1);
		assert.equal(searchDoc[0]?.fullName, "Алексеев Алексей");
	});
});
