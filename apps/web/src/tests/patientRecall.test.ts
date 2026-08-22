/**
 * Unit Test Suite for Clinical Recall & Patient Retention Engine
 * (DOMAIN: RECALLS)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	RECALL_CYCLE_CATALOG,
	addCalendarMonthsSafe,
	calculateDaysOverdue,
	calculateRecallMetrics,
	calculateRecallProfile,
	evaluateClinicalCycleSuggestion,
	filterAndSortRecallCandidates,
	formatIsoDateOnly,
	resolveUrgencyStatus,
	type PatientRecallCandidate,
	type RecallCycleType,
} from "../components/recalls/recallEngine";
import {
	CLINICAL_CALLING_SCRIPTS,
	buildWhatsAppUrl,
	extractFirstName,
	generate1ClickBookingLink,
	generateSmsRecallMessage,
	generateWhatsAppRecallMessage,
	interpolateRecallTemplate,
	sanitizePhoneNumber,
} from "../components/recalls/recallTemplates";

describe("Patient Recall & Prophylaxis Engine - Clinical Risk Stratification", () => {
	it("catalog contains all 6 mandatory risk-stratified clinical prophylaxis cycles", () => {
		const cycles = Object.keys(RECALL_CYCLE_CATALOG) as RecallCycleType[];
		assert.equal(cycles.length, 6);
		assert.ok(cycles.includes("caries_high_risk"));
		assert.ok(cycles.includes("periodontal_maintenance"));
		assert.ok(cycles.includes("implant_monitoring"));
		assert.ok(cycles.includes("orthodontic_retention"));
		assert.ok(cycles.includes("standard_prophylaxis"));
		assert.ok(cycles.includes("pediatric_fluoridation"));
	});

	it("verifies interval constraints and rationale for each clinical cycle", () => {
		// Caries high risk: 3 months
		const caries = RECALL_CYCLE_CATALOG.caries_high_risk;
		assert.equal(caries.defaultIntervalMonths, 3);
		assert.ok(caries.allowedIntervalsMonths.includes(3));
		assert.match(caries.clinicalRationale, /минерализации эмали/);

		// Periodontal maintenance: 3-4 months
		const perio = RECALL_CYCLE_CATALOG.periodontal_maintenance;
		assert.equal(perio.defaultIntervalMonths, 3);
		assert.ok(perio.allowedIntervalsMonths.includes(4));
		assert.equal(perio.requiresRadiologyCheck, true);

		// Implant monitoring: 4-6 months
		const implant = RECALL_CYCLE_CATALOG.implant_monitoring;
		assert.equal(implant.defaultIntervalMonths, 4);
		assert.ok(implant.allowedIntervalsMonths.includes(6));
		assert.equal(implant.requiresRadiologyCheck, true);

		// Orthodontic retention: 1, 3, 6, 12 months
		const ortho = RECALL_CYCLE_CATALOG.orthodontic_retention;
		assert.deepEqual(ortho.allowedIntervalsMonths, [1, 3, 6, 12]);

		// Standard prophylaxis: 6 months
		const standard = RECALL_CYCLE_CATALOG.standard_prophylaxis;
		assert.equal(standard.defaultIntervalMonths, 6);
		assert.equal(standard.preservesWarranty, true);

		// Pediatric fluoridation: 3 months
		const pedia = RECALL_CYCLE_CATALOG.pediatric_fluoridation;
		assert.equal(pedia.defaultIntervalMonths, 3);
		assert.match(pedia.clinicalRationale, /Несозревшая эмаль/);
	});
});

describe("Patient Recall & Prophylaxis Engine - Safe Calendar Math", () => {
	it("prevents month overflow and day skews at end of months", () => {
		// 31 August + 6 months -> 28 February (non-leap 2027) or 29 February (leap)
		const aug31 = new Date(2026, 7, 31); // 31 Aug 2026
		const plus6m = addCalendarMonthsSafe(aug31, 6);
		assert.equal(plus6m.getFullYear(), 2027);
		assert.equal(plus6m.getMonth(), 1); // February (0-indexed 1)
		assert.equal(plus6m.getDate(), 28);

		// 31 August + 3 months -> 30 November (NOT 1 December)
		const plus3m = addCalendarMonthsSafe(aug31, 3);
		assert.equal(plus3m.getFullYear(), 2026);
		assert.equal(plus3m.getMonth(), 10); // November (0-indexed 10)
		assert.equal(plus3m.getDate(), 30);

		// 31 January 2028 (leap year) + 1 month -> 29 February 2028
		const leapJan31 = new Date(2028, 0, 31);
		const plus1mLeap = addCalendarMonthsSafe(leapJan31, 1);
		assert.equal(plus1mLeap.getFullYear(), 2028);
		assert.equal(plus1mLeap.getMonth(), 1);
		assert.equal(plus1mLeap.getDate(), 29);

		// 31 May + 4 months -> 30 September
		const may31 = new Date(2026, 4, 31);
		const plus4m = addCalendarMonthsSafe(may31, 4);
		assert.equal(plus4m.getFullYear(), 2026);
		assert.equal(plus4m.getMonth(), 8); // September
		assert.equal(plus4m.getDate(), 30);
	});

	it("formats ISO date string without time offsets", () => {
		const d = new Date(2026, 4, 15);
		assert.equal(formatIsoDateOnly(d), "2026-05-15");
	});
});

describe("Patient Recall & Prophylaxis Engine - Overdue Days & Urgency Resolution", () => {
	it("correctly calculates overdue days difference", () => {
		const dueDate = "2026-08-10";
		const refDate1 = "2026-08-22"; // 12 days overdue
		assert.equal(calculateDaysOverdue(dueDate, refDate1), 12);

		const refDate2 = "2026-08-01"; // 9 days before due date
		assert.equal(calculateDaysOverdue(dueDate, refDate2), -9);

		const refDate3 = "2026-08-10"; // Exactly due date
		assert.equal(calculateDaysOverdue(dueDate, refDate3), 0);
	});

	it("resolves urgency statuses with high clinical precision", () => {
		const dueDate = "2026-06-01";

		// Completed status override
		assert.equal(resolveUrgencyStatus(dueDate, "2026-08-01", true), "completed");

		// Upcoming (future due date)
		assert.equal(resolveUrgencyStatus("2026-09-01", "2026-08-20"), "upcoming");

		// Due now (0 to 29 days overdue)
		assert.equal(resolveUrgencyStatus("2026-08-10", "2026-08-22"), "due_now"); // 12 days
		assert.equal(resolveUrgencyStatus("2026-08-01", "2026-08-30"), "due_now"); // 29 days

		// Overdue 30 (30 to 89 days late)
		assert.equal(resolveUrgencyStatus("2026-07-01", "2026-08-15"), "overdue_30"); // 45 days
		assert.equal(resolveUrgencyStatus("2026-05-25", "2026-08-22"), "overdue_30"); // 89 days

		// Overdue 90 (>= 90 days late)
		assert.equal(resolveUrgencyStatus("2026-05-20", "2026-08-22"), "overdue_90"); // 94 days
		assert.equal(resolveUrgencyStatus("2025-10-01", "2026-08-22"), "overdue_90");
	});

	it("calculates full recall profile with custom interval overrides", () => {
		const profile = calculateRecallProfile({
			lastVisitDate: "2026-02-15",
			cycleType: "implant_monitoring",
			customIntervalMonths: 6, // override default 4 to 6
			referenceDate: "2026-08-22",
		});

		assert.equal(profile.formattedDueDate, "2026-08-15");
		assert.equal(profile.daysOverdue, 7);
		assert.equal(profile.urgencyStatus, "due_now");
		assert.equal(profile.intervalMonths, 6);
	});
});

describe("Patient Recall & Prophylaxis Engine - Automated Clinical Suggestion", () => {
	it("prioritizes periodontal risk when pocket depth >= 4mm or BOP present", () => {
		const suggestion = evaluateClinicalCycleSuggestion({
			maxPocketDepthMm: 5,
			hasBleedingOnProbing: true,
			hasImplants: true,
		});
		assert.equal(suggestion.suggestedCycle, "periodontal_maintenance");
		assert.equal(suggestion.recommendedIntervalMonths, 3);
		assert.match(suggestion.reason, /глубина ПК 5 мм/);
	});

	it("suggests implant monitoring when implants present", () => {
		const recentImplant = evaluateClinicalCycleSuggestion({
			hasImplants: true,
			monthsSinceImplantSurgery: 6,
		});
		assert.equal(recentImplant.suggestedCycle, "implant_monitoring");
		assert.equal(recentImplant.recommendedIntervalMonths, 4);

		const matureImplant = evaluateClinicalCycleSuggestion({
			hasImplants: true,
			monthsSinceImplantSurgery: 24,
		});
		assert.equal(matureImplant.suggestedCycle, "implant_monitoring");
		assert.equal(matureImplant.recommendedIntervalMonths, 6);
	});

	it("suggests pediatric fluoridation for children under 14", () => {
		const pedia = evaluateClinicalCycleSuggestion({
			isChildUnder14: true,
		});
		assert.equal(pedia.suggestedCycle, "pediatric_fluoridation");
		assert.equal(pedia.recommendedIntervalMonths, 3);
	});

	it("suggests orthodontic retention for patients with retainers", () => {
		const ortho = evaluateClinicalCycleSuggestion({
			hasActiveRetention: true,
		});
		assert.equal(ortho.suggestedCycle, "orthodontic_retention");
		assert.equal(ortho.recommendedIntervalMonths, 3);
	});

	it("suggests caries high risk for high decay count", () => {
		const caries = evaluateClinicalCycleSuggestion({
			hasDeepCaries: true,
			decayedTeethCount: 4,
		});
		assert.equal(caries.suggestedCycle, "caries_high_risk");
		assert.equal(caries.recommendedIntervalMonths, 3);
	});

	it("defaults to standard 6-month prophylaxis for healthy patients", () => {
		const standard = evaluateClinicalCycleSuggestion({});
		assert.equal(standard.suggestedCycle, "standard_prophylaxis");
		assert.equal(standard.recommendedIntervalMonths, 6);
	});
});

describe("Patient Recall & Prophylaxis Engine - Conversion & Retention Metrics", () => {
	it("computes accurate cohort metrics, conversion and retention percentages", () => {
		const candidates: PatientRecallCandidate[] = [
			{
				id: "1",
				patientId: "p1",
				fullName: "Иванов И.И.",
				phone: "+79161112233",
				email: null,
				cycleType: "standard_prophylaxis",
				lastVisitDate: "2026-01-10",
				dueDate: "2026-07-10",
				daysOverdue: 42,
				urgencyStatus: "overdue_30",
				status: "scheduled",
			},
			{
				id: "2",
				patientId: "p2",
				fullName: "Петров П.П.",
				phone: "+79162223344",
				email: null,
				cycleType: "caries_high_risk",
				lastVisitDate: "2026-05-10",
				dueDate: "2026-08-10",
				daysOverdue: 12,
				urgencyStatus: "due_now",
				status: "completed",
			},
			{
				id: "3",
				patientId: "p3",
				fullName: "Сидоров С.С.",
				phone: "+79163334455",
				email: null,
				cycleType: "periodontal_maintenance",
				lastVisitDate: "2025-11-01",
				dueDate: "2026-02-01",
				daysOverdue: 200,
				urgencyStatus: "overdue_90",
				status: "pending",
			},
			{
				id: "4",
				patientId: "p4",
				fullName: "Кузнецов К.К.",
				phone: "+79164445566",
				email: null,
				cycleType: "standard_prophylaxis",
				lastVisitDate: "2026-04-01",
				dueDate: "2026-10-01",
				daysOverdue: -40,
				urgencyStatus: "upcoming",
				status: "pending",
			},
		];

		const metrics = calculateRecallMetrics(candidates, 6500);

		assert.equal(metrics.totalCandidates, 4);
		assert.equal(metrics.dueNowCount, 1);
		assert.equal(metrics.overdue30Count, 1);
		assert.equal(metrics.overdue90Count, 1);
		assert.equal(metrics.upcomingCount, 1);
		assert.equal(metrics.scheduledCount, 1);
		assert.equal(metrics.completedCount, 1);

		// Conversion rate: (1 scheduled + 1 completed) / 4 total = 50%
		assert.equal(metrics.conversionRatePercent, 50);

		// Retention rate: completed (1) / past due base (4 total - 1 upcoming = 3) = 33.3%
		assert.equal(metrics.retentionRatePercent, 33.3);

		// Lost revenue: 2 overdue (overdue_30 + overdue_90) * 6500 = 13000
		assert.equal(metrics.overdueEstimatedLostRevenueRub, 13000);
	});
});

describe("Patient Recall & Prophylaxis Engine - Candidate Filtering and Search", () => {
	const testCandidates: PatientRecallCandidate[] = [
		{
			id: "1",
			patientId: "p1",
			fullName: "Алексеев Алексей",
			phone: "+7 (916) 123-45-67",
			email: null,
			cycleType: "caries_high_risk",
			lastVisitDate: "2026-05-01",
			dueDate: "2026-08-01",
			daysOverdue: 21,
			urgencyStatus: "due_now",
			attendingDoctorId: "doc-1",
			attendingDoctorName: "Д-р Кузнецова",
			status: "pending",
		},
		{
			id: "2",
			patientId: "p2",
			fullName: "Борисов Борис",
			phone: "+7 (925) 987-65-43",
			email: null,
			cycleType: "periodontal_maintenance",
			lastVisitDate: "2026-02-01",
			dueDate: "2026-05-01",
			daysOverdue: 110,
			urgencyStatus: "overdue_90",
			attendingDoctorId: "doc-2",
			attendingDoctorName: "Д-р Морозов",
			status: "pending",
		},
	];

	it("filters by urgency status and search query correctly", () => {
		const dueNowFiltered = filterAndSortRecallCandidates(testCandidates, {
			urgencyStatus: "due_now",
		});
		assert.equal(dueNowFiltered.length, 1);
		assert.equal(dueNowFiltered[0]?.fullName, "Алексеев Алексей");

		const searchByPhone = filterAndSortRecallCandidates(testCandidates, {
			searchQuery: "9876543",
		});
		assert.equal(searchByPhone.length, 1);
		assert.equal(searchByPhone[0]?.fullName, "Борисов Борис");

		const searchByDoctor = filterAndSortRecallCandidates(testCandidates, {
			searchQuery: "Кузнецова",
		});
		assert.equal(searchByDoctor.length, 1);
		assert.equal(searchByDoctor[0]?.fullName, "Алексеев Алексей");
	});
});

describe("Omnichannel Templates & 1-Click Booking Links (recallTemplates.ts)", () => {
	it("extracts patient first name and sanitizes phone numbers reliably", () => {
		assert.equal(extractFirstName("Иванов Иван Иванович"), "Иван");
		assert.equal(extractFirstName("Петрова Анна"), "Анна");
		assert.equal(extractFirstName("Смирнов"), "Смирнов");
		assert.equal(extractFirstName(""), "Пациент");

		assert.equal(sanitizePhoneNumber("+7 (916) 123-45-67"), "79161234567");
		assert.equal(sanitizePhoneNumber("8 (925) 987-65-43"), "79259876543");
	});

	it("generates 1-Click booking URL with UTM tracking and prefilled services", () => {
		const url = generate1ClickBookingLink({
			baseUrl: "https://clinic.example.com",
			patientId: "pat-123",
			doctorId: "doc-456",
			cycleType: "implant_monitoring",
			campaign: "recall_q3",
		});

		assert.ok(url.startsWith("https://clinic.example.com/booking?"));
		assert.ok(url.includes("patient_id=pat-123"));
		assert.ok(url.includes("doctor_id=doc-456"));
		assert.ok(url.includes("recall_cycle=implant_monitoring"));
		assert.ok(url.includes("utm_campaign=recall_q3"));
	});

	it("interpolates WhatsApp and SMS messages with clinical terms and doctor info", () => {
		const candidate: PatientRecallCandidate = {
			id: "c1",
			patientId: "p1",
			fullName: "Кузнецов Михаил Сергеевич",
			phone: "+79161112233",
			email: null,
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-02-10",
			dueDate: "2026-08-10",
			daysOverdue: 12,
			urgencyStatus: "due_now",
			attendingDoctorName: "Д-р Васильев",
			status: "pending",
		};

		const waMessage = generateWhatsAppRecallMessage(candidate, {
			clinicName: "DENTE VIP",
		});
		assert.match(waMessage, /Здравствуйте, Михаил!/);
		assert.match(waMessage, /DENTE VIP/);
		assert.match(waMessage, /Д-р Васильев/);
		assert.match(waMessage, /сохранения здоровья зубов и гарантии/);
		assert.match(waMessage, /booking\?patient_id=p1/);

		const smsMessage = generateSmsRecallMessage(candidate, {
			clinicName: "DENTE",
		});
		assert.match(smsMessage, /Михаил, прошло полгода с осмотра в DENTE/);
		assert.match(smsMessage, /booking\?patient_id=p1/);
	});

	it("generates WhatsApp wa.me direct links", () => {
		const waUrl = buildWhatsAppUrl("+7 (916) 123-45-67", "Привет, мир!");
		assert.ok(waUrl.startsWith("https://wa.me/79161234567?text="));
		assert.ok(waUrl.includes(encodeURIComponent("Привет, мир!")));
	});

	it("calling scripts contain clinical objection handling for receptionists", () => {
		const script = CLINICAL_CALLING_SCRIPTS.standard_prophylaxis;
		assert.ok(script.objections.length >= 4);

		const noPainObj = script.objections.find((o) => o.id === "no_pain");
		assert.ok(noPainObj);
		assert.match(noPainObj.clinicalRationale, /Скрытый апроксимальный кариес/);
		assert.match(noPainObj.suggestedResponse, /цель профилактики — не допустить боли/);

		const expensiveObj = script.objections.find((o) => o.id === "expensive");
		assert.ok(expensiveObj);
		assert.match(expensiveObj.clinicalRationale, /Стоимость профгигиены/);
	});
});
