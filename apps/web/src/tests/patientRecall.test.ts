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
	createMultiRecallRecordsForPatient,
	evaluateClinicalCycleSuggestion,
	evaluateMultiRecallChannels,
	filterAndSortRecallCandidates,
	formatHumanRecallBadge,
	formatIsoDateOnly,
	formatRussianDaysPlural,
	formatRussianMonthAccusative,
	isPatientEligibleForRecall,
	isProfessionalHygieneProcedure,
	markRecallRecordScheduled,
	postponeRecallRecord,
	processVisitForPatientRecalls,
	resolveUrgencyStatus,
	shouldResetRecallTimer,
	type PatientRecallCandidate,
	type PatientRecallRecord,
	type RecallCycleType,
} from "../components/recalls/patientRecallEngine";
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
		assert.ok(cycles.length >= 6);
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
		assert.ok(caries);
		assert.equal(caries.defaultIntervalMonths, 3);
		assert.ok(caries.allowedIntervalsMonths.includes(3));
		assert.match(caries.clinicalRationale, /минерализации эмали/);

		// Periodontal maintenance: 3-4 months
		const perio = RECALL_CYCLE_CATALOG.periodontal_maintenance;
		assert.ok(perio);
		assert.equal(perio.defaultIntervalMonths, 3);
		assert.ok(perio.allowedIntervalsMonths.includes(4));
		assert.equal(perio.requiresRadiologyCheck, true);

		// Implant monitoring: 4-6 months
		const implant = RECALL_CYCLE_CATALOG.implant_monitoring;
		assert.ok(implant);
		assert.equal(implant.defaultIntervalMonths, 4);
		assert.ok(implant.allowedIntervalsMonths.includes(6));
		assert.equal(implant.requiresRadiologyCheck, true);

		// Orthodontic retention: 1, 3, 6, 12 months
		const ortho = RECALL_CYCLE_CATALOG.orthodontic_retention;
		assert.ok(ortho);
		assert.deepEqual(ortho.allowedIntervalsMonths, [1, 3, 6, 12]);

		// Standard prophylaxis: 6 months
		const standard = RECALL_CYCLE_CATALOG.standard_prophylaxis;
		assert.ok(standard);
		assert.equal(standard.defaultIntervalMonths, 6);
		assert.equal(standard.preservesWarranty, true);

		// Pediatric fluoridation: 3 months
		const pedia = RECALL_CYCLE_CATALOG.pediatric_fluoridation;
		assert.ok(pedia);
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
		assert.match(smsMessage, /Михаил, прошло 6 мес с визита в DENTE/);
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

describe("Patient Recall Engine - Multi-Recall Channel Separation (Mandate 1)", () => {
	it("separates hygiene (6m) and implant monitoring (milestones 1-12m) for an adult with implants without overwriting", () => {
		const patientInput = {
			lastVisitDate: "2026-03-01",
			lastCleaningDate: "2026-03-01",
			implantSurgeryDate: "2026-01-15",
			hasImplants: true,
			implantsCount: 2,
			referenceDate: "2026-06-01",
		};

		const evaluation = evaluateMultiRecallChannels(patientInput);
		assert.equal(evaluation.hasMultipleRecalls, true);
		assert.equal(evaluation.triggers.length, 2);

		const channels = evaluation.triggers.map((t) => t.channelId);
		assert.ok(channels.includes("hygiene_periodontal"));
		assert.ok(channels.includes("implant_monitoring"));

		// Generate independent records
		const records = createMultiRecallRecordsForPatient(
			{
				id: "pat-impl-1",
				fullName: "Барабаш Сергей Владимирович",
				phone: "+79161234567",
			},
			patientInput,
		);

		assert.equal(records.length, 2);
		const hygieneRec = records.find((r) => r.channelId === "hygiene_periodontal");
		const implantRec = records.find((r) => r.channelId === "implant_monitoring");

		assert.ok(hygieneRec);
		assert.ok(implantRec);
		assert.notEqual(hygieneRec.id, implantRec.id);
		assert.equal(hygieneRec.id, "pat-impl-1_hygiene_periodontal");
		assert.equal(implantRec.id, "pat-impl-1_implant_monitoring");

		// Hygiene due date: 2026-03-01 + 6 months = 2026-09-01
		assert.equal(hygieneRec.dueDate, "2026-09-01");
		// Implant check: independent milestone timer from surgery date
		assert.equal(implantRec.cycleType, "implant_monitoring");
	});

	it("separates orthodontic braces activation (4 weeks) and periodontal maintenance (3 months) without overwriting", () => {
		const orthoPerioInput = {
			lastVisitDate: "2026-04-01",
			lastCleaningDate: "2026-03-15",
			lastOrthoAdjustmentDate: "2026-04-01",
			hasBraces: true,
			maxPocketDepthMm: 5,
			hasBleedingOnProbing: true,
			referenceDate: "2026-04-20",
		};

		const evaluation = evaluateMultiRecallChannels(orthoPerioInput);
		assert.equal(evaluation.hasMultipleRecalls, true);
		assert.equal(evaluation.triggers.length, 2);

		const orthoTrig = evaluation.triggers.find((t) => t.channelId === "orthodontic_activation");
		const perioTrig = evaluation.triggers.find((t) => t.channelId === "hygiene_periodontal");

		assert.ok(orthoTrig);
		assert.ok(perioTrig);
		// Ortho interval: strictly 4 weeks / 28 days
		assert.equal(orthoTrig.intervalWeeks, 4);
		assert.equal(orthoTrig.formattedDueDate, "2026-04-29");

		// Perio interval: 3 months
		assert.equal(perioTrig.intervalMonths, 3);
		assert.equal(perioTrig.mappedCycleType, "periodontal_maintenance");
		assert.equal(perioTrig.formattedDueDate, "2026-06-15");
	});

	it("separates pediatric check (3 months) and orthodontic check for children with appliances", () => {
		const childInput = {
			lastVisitDate: "2026-05-01",
			isChildUnder14: true,
			age: 10,
			hasOrthodonticAppliance: true,
			referenceDate: "2026-05-10",
		};

		const evaluation = evaluateMultiRecallChannels(childInput);
		assert.equal(evaluation.hasMultipleRecalls, true);

		const channels = evaluation.triggers.map((t) => t.channelId);
		assert.ok(channels.includes("pediatric_prophylaxis"));
		assert.ok(channels.includes("orthodontic_activation"));
		assert.ok(channels.includes("hygiene_periodontal"));
	});
});

describe("Patient Recall Engine - False Recall Reset Prevention (Mandate 2)", () => {
	it("routine caries filling (A16.07.002) DOES NOT reset professional hygiene recall timer", () => {
		const hygieneRecall: PatientRecallRecord = {
			id: "rec-1",
			patientId: "pat-1",
			fullName: "Ковалев Андрей Иванович",
			phone: "+79031112233",
			cycleType: "standard_prophylaxis",
			clinicalTriggerType: "hygiene_6m",
			lastVisitDate: "2026-01-10",
			dueDate: "2026-07-10",
			daysOverdue: 20,
			urgencyStatus: "due_now",
			status: "due_now",
		};

		// Patient visited clinic on 2026-07-30 for caries filling of tooth 16
		const therapeuticVisit = {
			visitDate: "2026-07-30",
			procedures: [
				{
					code804n: "A16.07.002",
					name: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием светоотверждаемых материалов",
				},
				{
					code804n: "A11.07.027",
					name: "Наложение коффердама (раббердама)",
				},
			],
			isCompleted: true,
		};

		// Verify detector: neither procedure is professional hygiene
		assert.equal(isProfessionalHygieneProcedure(therapeuticVisit.procedures[0]!), false);
		assert.equal(isProfessionalHygieneProcedure(therapeuticVisit.procedures[1]!), false);

		// Verify reset decider: MUST be false
		const shouldReset = shouldResetRecallTimer(hygieneRecall, therapeuticVisit.procedures);
		assert.equal(shouldReset, false);

		// Process visit through engine
		const result = processVisitForPatientRecalls([hygieneRecall], therapeuticVisit, "2026-07-30");
		assert.equal(result.resetCount, 0);
		assert.equal(result.unchangedCount, 1);

		// Hygiene recall timer MUST remain untouched!
		const resultingRecall = result.updatedRecalls[0]!;
		assert.equal(resultingRecall.dueDate, "2026-07-10");
		assert.equal(resultingRecall.lastVisitDate, "2026-01-10");
		assert.equal(resultingRecall.daysOverdue, 20);
	});

	it("endodontic pulpitis treatment (A16.07.030) or tooth extraction DOES NOT reset hygiene recall", () => {
		const hygieneRecall: PatientRecallRecord = {
			id: "rec-2",
			patientId: "pat-2",
			fullName: "Смирнова Елена Викторовна",
			phone: "+79032223344",
			cycleType: "standard_prophylaxis",
			clinicalTriggerType: "hygiene_6m",
			lastVisitDate: "2026-02-01",
			dueDate: "2026-08-01",
			daysOverdue: 15,
			urgencyStatus: "due_now",
			status: "due_now",
		};

		const surgeryVisit = {
			visitDate: "2026-08-16",
			procedures: [
				{ code804n: "A16.07.001", name: "Удаление постоянного зуба простое (зуб 3.8)" },
				{ code804n: "A16.07.030", name: "Инструментальная и медикаментозная обработка корневого канала" },
			],
		};

		assert.equal(shouldResetRecallTimer(hygieneRecall, surgeryVisit.procedures), false);

		const result = processVisitForPatientRecalls([hygieneRecall], surgeryVisit, "2026-08-16");
		assert.equal(result.resetCount, 0);
		assert.equal(result.unchangedCount, 1);
		assert.equal(result.updatedRecalls[0]!.dueDate, "2026-08-01");
	});

	it("professional hygiene procedure (A16.07.051 / Air-Flow / УЗ) DOES reset hygiene recall timer", () => {
		const hygieneRecall: PatientRecallRecord = {
			id: "rec-3",
			patientId: "pat-3",
			fullName: "Федоров Дмитрий Олегович",
			phone: "+79033334455",
			cycleType: "standard_prophylaxis",
			clinicalTriggerType: "hygiene_6m",
			lastVisitDate: "2026-01-15",
			dueDate: "2026-07-15",
			daysOverdue: 25,
			urgencyStatus: "due_now",
			status: "due_now",
		};

		const hygieneVisit = {
			visitDate: "2026-08-10",
			procedures: [
				{
					code804n: "A16.07.051",
					name: "Профессиональная гигиена полости рта и зубов (УЗ скейлинг + Air-Flow + полировка)",
				},
			],
			isCompleted: true,
		};

		assert.equal(isProfessionalHygieneProcedure(hygieneVisit.procedures[0]!), true);
		assert.equal(shouldResetRecallTimer(hygieneRecall, hygieneVisit.procedures), true);

		const result = processVisitForPatientRecalls([hygieneRecall], hygieneVisit, "2026-08-10");
		assert.equal(result.resetCount, 1);
		assert.equal(result.unchangedCount, 0);

		// New due date: 2026-08-10 + 6 months = 2027-02-10
		const updated = result.updatedRecalls[0]!;
		assert.equal(updated.lastVisitDate, "2026-08-10");
		assert.equal(updated.dueDate, "2027-02-10");
		assert.equal(updated.urgencyStatus, "upcoming");
	});

	it("subcodes (A16.07.051.001) and ultrasonic scaling (A22.07.001) correctly recognized as hygiene", () => {
		assert.equal(
			isProfessionalHygieneProcedure({ code804n: "A16.07.051.001", name: "Снятие зубных отложений УЗ" }),
			true,
		);
		assert.equal(
			isProfessionalHygieneProcedure({ code804n: "A22.07.001", name: "Ультразвуковое удаление зубного камня" }),
			true,
		);
		assert.equal(
			isProfessionalHygieneProcedure({ code804n: "A16.07.020", name: "Удаление поддесневых отложений" }),
			true,
		);
	});
});

describe("Patient Recall Engine - 1-Click Ergonomics & Automated Inactive Exclusion", () => {
	it("postponeRecallRecord moves due date by 2 weeks (14 days) and records notes", () => {
		const record: PatientRecallRecord = {
			id: "rec-p1",
			patientId: "pat-p1",
			fullName: "Васильев Петр Петрович",
			phone: "+79110001122",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-02-01",
			dueDate: "2026-08-01",
			daysOverdue: 10,
			urgencyStatus: "due_now",
			status: "due_now",
		};

		const postponed = postponeRecallRecord(record, "2_weeks", "Пациент в отпуске на море", "2026-08-11");
		// 2026-08-11 (ref) + 14 days = 2026-08-25
		assert.equal(postponed.dueDate, "2026-08-25");
		assert.equal(postponed.status, "declined");
		assert.equal(postponed.postponedUntil, "2026-08-25");
		assert.match(postponed.clinicalNotes || "", /Отложено на 2 недели/);
		assert.match(postponed.clinicalNotes || "", /Пациент в отпуске на море/);
	});

	it("postponeRecallRecord moves due date by 1 month", () => {
		const record: PatientRecallRecord = {
			id: "rec-p2",
			patientId: "pat-p2",
			fullName: "Григорьева Мария Сергеевна",
			phone: "+79112223344",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-01-10",
			dueDate: "2026-07-10",
			daysOverdue: 0,
			urgencyStatus: "due_now",
			status: "due_now",
		};

		const postponed = postponeRecallRecord(record, "1_month", "Командировка", "2026-07-10");
		// 2026-07-10 + 1 month = 2026-08-10
		assert.equal(postponed.dueDate, "2026-08-10");
		assert.match(postponed.clinicalNotes || "", /Отложено на 1 месяц/);
	});

	it("markRecallRecordScheduled sets status to scheduled and urgency to upcoming", () => {
		const record: PatientRecallRecord = {
			id: "rec-p3",
			patientId: "pat-p3",
			fullName: "Зайцев Константин Николаевич",
			phone: "+79113334455",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-01-15",
			dueDate: "2026-07-15",
			daysOverdue: 5,
			urgencyStatus: "due_now",
			status: "due_now",
		};

		const scheduled = markRecallRecordScheduled(record, "2026-07-25", "appt-100");
		assert.equal(scheduled.status, "scheduled");
		assert.equal(scheduled.urgencyStatus, "upcoming");
		assert.equal(scheduled.scheduledDate, "2026-07-25");
		assert.equal(scheduled.scheduledAppointmentId, "appt-100");
	});

	it("automatically excludes archived and deceased patients from calling queues", () => {
		const activeCandidate: PatientRecallRecord = {
			id: "c-active",
			patientId: "pat-act",
			fullName: "Живой Пациент",
			phone: "+79160000001",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-01-01",
			dueDate: "2026-07-01",
			daysOverdue: 10,
			urgencyStatus: "due_now",
			status: "due_now",
		};

		const archivedCandidate: PatientRecallRecord = {
			...activeCandidate,
			id: "c-archived",
			patientId: "pat-arc",
			fullName: "Архивный Пациент",
			isArchived: true,
		};

		const deceasedCandidate: PatientRecallRecord = {
			...activeCandidate,
			id: "c-deceased",
			patientId: "pat-dec",
			fullName: "Умерший Пациент",
			isDeceased: true,
		};

		const inactiveCandidate: PatientRecallRecord = {
			...activeCandidate,
			id: "c-inactive",
			patientId: "pat-inact",
			fullName: "Неактивный Пациент",
			patientStatus: "archived",
		};

		// Direct eligibility check
		assert.equal(isPatientEligibleForRecall(activeCandidate), true);
		assert.equal(isPatientEligibleForRecall(archivedCandidate), false);
		assert.equal(isPatientEligibleForRecall(deceasedCandidate), false);
		assert.equal(isPatientEligibleForRecall(inactiveCandidate), false);

		// Filtering candidate list: excludes archived/deceased automatically
		const allList = [activeCandidate, archivedCandidate, deceasedCandidate, inactiveCandidate];
		const filtered = filterAndSortRecallCandidates(allList, {});
		assert.equal(filtered.length, 1);
		assert.equal(filtered[0]?.fullName, "Живой Пациент");

		// If explicitly requesting includeArchived: true
		const withArchived = filterAndSortRecallCandidates(allList, { includeArchived: true });
		assert.equal(withArchived.length, 4);
	});
});

describe("Patient Recall Engine - Human-Readable UI Badges Without Bureaucracy", () => {
	it("formats 'due_now' as 'Срок подошел'", () => {
		const badge = formatHumanRecallBadge({
			urgencyStatus: "due_now",
			daysOverdue: 0,
			dueDate: "2026-08-15",
		});
		assert.equal(badge.badgeText, "Срок подошел");
		assert.equal(badge.badgeClass, "due_now");
	});

	it("formats overdue with correct Russian day plurals: 'Просрочен на 12 дней', 'Просрочен на 1 день', 'Просрочен на 3 дня'", () => {
		assert.equal(formatRussianDaysPlural(1), "1 день");
		assert.equal(formatRussianDaysPlural(2), "2 дня");
		assert.equal(formatRussianDaysPlural(3), "3 дня");
		assert.equal(formatRussianDaysPlural(4), "4 дня");
		assert.equal(formatRussianDaysPlural(5), "5 дней");
		assert.equal(formatRussianDaysPlural(11), "11 дней");
		assert.equal(formatRussianDaysPlural(12), "12 дней");
		assert.equal(formatRussianDaysPlural(21), "21 день");
		assert.equal(formatRussianDaysPlural(24), "24 дня");
		assert.equal(formatRussianDaysPlural(25), "25 дней");

		const badge12 = formatHumanRecallBadge({
			urgencyStatus: "overdue_30",
			daysOverdue: 12,
			dueDate: "2026-08-01",
		});
		assert.equal(badge12.badgeText, "Просрочен на 12 дней");

		const badge1 = formatHumanRecallBadge({
			urgencyStatus: "overdue_30",
			daysOverdue: 1,
			dueDate: "2026-08-14",
		});
		assert.equal(badge1.badgeText, "Просрочен на 1 день");

		const badge90 = formatHumanRecallBadge({
			urgencyStatus: "overdue_90",
			daysOverdue: 95,
			dueDate: "2026-05-10",
		});
		assert.equal(badge90.badgeText, "Просрочен на 95 дней");
	});

	it("formats upcoming with target month name in accusative case: 'Запланирован на ноябрь'", () => {
		assert.equal(formatRussianMonthAccusative("2026-11-15"), "ноябрь");
		assert.equal(formatRussianMonthAccusative("2026-05-20"), "май");
		assert.equal(formatRussianMonthAccusative("2026-01-10"), "январь");

		const badgeNov = formatHumanRecallBadge({
			urgencyStatus: "upcoming",
			daysOverdue: -45,
			dueDate: "2026-11-20",
			referenceDate: "2026-10-01",
		});
		assert.equal(badgeNov.badgeText, "Запланирован на ноябрь");

		const badgeDec = formatHumanRecallBadge({
			urgencyStatus: "upcoming",
			daysOverdue: -60,
			dueDate: "2026-12-05",
			referenceDate: "2026-10-01",
		});
		assert.equal(badgeDec.badgeText, "Запланирован на декабрь");
	});

	it("formats scheduled and completed statuses cleanly without jargon", () => {
		const scheduledBadge = formatHumanRecallBadge({
			urgencyStatus: "upcoming",
			daysOverdue: 0,
			dueDate: "2026-09-01",
			status: "scheduled",
		});
		assert.equal(scheduledBadge.badgeText, "Записан на прием");

		const completedBadge = formatHumanRecallBadge({
			urgencyStatus: "completed",
			daysOverdue: 0,
			dueDate: "2026-08-10",
			status: "completed",
		});
		assert.equal(completedBadge.badgeText, "Визит завершен");
	});
});
