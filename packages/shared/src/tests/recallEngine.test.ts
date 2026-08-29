import assert from "node:assert";
import { describe, it } from "node:test";
import {
	addCalendarMonthsSafe,
	addDaysSafe,
	addWeeksSafe,
	calculateDaysOverdue,
	calculateDaysUntilDue,
	calculateRecallCohortMetrics,
	calculateRecallDueDate,
	calculateRecallDueDateString,
	canTransitionRecallStatus,
	CLINICAL_RECALL_CADENCES,
	determineRecallStatus,
	filterDueRecalls,
	filterOverdueRecalls,
	filterUpcomingRecalls,
	formatIsoDateOnly,
	generateRecallMessage,
	normalizeRecallCategory,
	recallDispensaryRecordSchema,
	renderRecallMessageTemplate,
	type RecallDispensaryRecord,
} from "../recall/recallEngine.js";

describe("Clinical Dispensary Recall & Retention Engine (recallEngine.ts)", () => {
	describe("1. Clinical Recall Cadences & Automated Interval Calculations", () => {
		it("calculates 6-month interval for Prophylaxis / Air-Flow", () => {
			const completionDate = new Date("2026-03-15T10:00:00Z");
			const dueDate = calculateRecallDueDate(completionDate, "hygiene_airflow");

			assert.strictEqual(formatIsoDateOnly(dueDate), "2026-09-15");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "hygiene"), "2026-09-15");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "air_flow"), "2026-09-15");

			const cadence = CLINICAL_RECALL_CADENCES.hygiene_airflow;
			assert.strictEqual(cadence.defaultIntervalMonths, 6);
			assert.strictEqual(cadence.preservesWarranty, true);
		});

		it("calculates 12-month interval for Implant CBCT & Warranty Review", () => {
			const completionDate = new Date("2026-04-10T12:00:00Z");
			const dueDate = calculateRecallDueDate(completionDate, "implant_cbct_control");

			assert.strictEqual(formatIsoDateOnly(dueDate), "2027-04-10");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "implant_check"), "2027-04-10");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "импланты"), "2027-04-10");

			const cadence = CLINICAL_RECALL_CADENCES.implant_cbct_control;
			assert.strictEqual(cadence.defaultIntervalMonths, 12);
			assert.strictEqual(cadence.requiresRadiologyCheck, true);
			assert.strictEqual(cadence.preservesWarranty, true);
			assert.strictEqual(cadence.priority, "high");
		});

		it("calculates 4-week (28 days) interval for Orthodontics (Braces / Aligners)", () => {
			const completionDate = new Date("2026-05-01T09:00:00Z");
			const dueDate = calculateRecallDueDate(completionDate, "ortho_activation");

			// May 1 + 28 days -> May 29
			assert.strictEqual(formatIsoDateOnly(dueDate), "2026-05-29");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "orthodontics"), "2026-05-29");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "брекеты"), "2026-05-29");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "элайнеры"), "2026-05-29");

			const cadence = CLINICAL_RECALL_CADENCES.ortho_activation;
			assert.strictEqual(cadence.defaultIntervalWeeks, 4);
			assert.strictEqual(cadence.defaultIntervalDays, 28);
		});

		it("calculates 6-month interval for Endodontics (X-Ray / Periapical Control)", () => {
			const completionDate = new Date("2026-02-20T14:00:00Z");
			const dueDate = calculateRecallDueDate(completionDate, "endo_xray_control");

			assert.strictEqual(formatIsoDateOnly(dueDate), "2026-08-20");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "endodontics"), "2026-08-20");
			assert.strictEqual(calculateRecallDueDateString(completionDate, "лечение_каналов"), "2026-08-20");

			const cadence = CLINICAL_RECALL_CADENCES.endo_xray_control;
			assert.strictEqual(cadence.defaultIntervalMonths, 6);
			assert.strictEqual(cadence.requiresRadiologyCheck, true);
		});

		it("handles end-of-month calendar overflow safely (e.g. Aug 31 + 6 months -> Feb 28)", () => {
			const aug31 = new Date("2026-08-31T00:00:00Z");
			const febResult = addCalendarMonthsSafe(aug31, 6);

			// 2026-08-31 + 6 months = 2027-02-28 (not March)
			assert.strictEqual(formatIsoDateOnly(febResult), "2027-02-28");

			// Leap year check: 2023-08-31 + 6 months = 2024-02-29 (2024 is leap)
			const leapAug = new Date("2023-08-31T00:00:00Z");
			const leapFeb = addCalendarMonthsSafe(leapAug, 6);
			assert.strictEqual(formatIsoDateOnly(leapFeb), "2024-02-29");
		});

		it("supports custom intervals in days, weeks, and months", () => {
			const base = "2026-01-10";

			const inDays = calculateRecallDueDate(base, "other", { days: 45 });
			assert.strictEqual(formatIsoDateOnly(inDays), "2026-02-24");

			const inWeeks = calculateRecallDueDate(base, "other", { weeks: 6 });
			assert.strictEqual(formatIsoDateOnly(inWeeks), "2026-02-21");

			const inMonths = calculateRecallDueDate(base, "other", { months: 9 });
			assert.strictEqual(formatIsoDateOnly(inMonths), "2026-10-10");
		});

		it("correctly normalizes Russian and English aliases for clinical categories", () => {
			assert.strictEqual(normalizeRecallCategory("чистка"), "hygiene_airflow");
			assert.strictEqual(normalizeRecallCategory("импланты"), "implant_cbct_control");
			assert.strictEqual(normalizeRecallCategory("брекеты"), "ortho_activation");
			assert.strictEqual(normalizeRecallCategory("эндодонтия"), "endo_xray_control");
			assert.strictEqual(normalizeRecallCategory("кариес"), "caries_control");
			assert.strictEqual(normalizeRecallCategory("пародонтология"), "perio_maintenance");
			assert.strictEqual(normalizeRecallCategory("детская"), "pediatric_fluoridation");
			assert.strictEqual(normalizeRecallCategory("коронки"), "prosthetic_check");
			assert.strictEqual(normalizeRecallCategory("unknown_test"), "other");
		});
	});

	describe("2. Dispensary Status Determination & State Machine", () => {
		const dueDate = "2026-08-20";

		it("resolves PLANNED status when reference date is > 14 days before due date", () => {
			const refDate = "2026-08-01"; // 19 days before due
			const status = determineRecallStatus({ dueDate, referenceDate: refDate });
			assert.strictEqual(status, "PLANNED");
			assert.strictEqual(calculateDaysOverdue(dueDate, refDate), -19);
			assert.strictEqual(calculateDaysUntilDue(dueDate, refDate), 19);
		});

		it("resolves UPCOMING status when reference date is within 14 days before due date", () => {
			const refDate14 = "2026-08-06"; // Exactly 14 days before
			assert.strictEqual(determineRecallStatus({ dueDate, referenceDate: refDate14 }), "UPCOMING");

			const refDate1 = "2026-08-19"; // 1 day before
			assert.strictEqual(determineRecallStatus({ dueDate, referenceDate: refDate1 }), "UPCOMING");
		});

		it("resolves DUE_NOW status when due date arrives or within 30 days after due date", () => {
			const refDate0 = "2026-08-20"; // Due day
			assert.strictEqual(determineRecallStatus({ dueDate, referenceDate: refDate0 }), "DUE_NOW");

			const refDate15 = "2026-09-04"; // 15 days past due
			assert.strictEqual(determineRecallStatus({ dueDate, referenceDate: refDate15 }), "DUE_NOW");

			const refDate30 = "2026-09-19"; // Exactly 30 days past due
			assert.strictEqual(determineRecallStatus({ dueDate, referenceDate: refDate30 }), "DUE_NOW");
		});

		it("resolves OVERDUE status when past due date by > 30 days", () => {
			const refDate31 = "2026-09-20"; // 31 days past due
			assert.strictEqual(determineRecallStatus({ dueDate, referenceDate: refDate31 }), "OVERDUE");

			const refDate90 = "2026-11-20"; // 92 days past due
			assert.strictEqual(determineRecallStatus({ dueDate, referenceDate: refDate90 }), "OVERDUE");
		});

		it("prioritizes CONTACTED and BOOKED states over temporal calculations", () => {
			const refDate = "2026-08-20";

			const contactedStatus = determineRecallStatus({
				dueDate,
				referenceDate: refDate,
				isContacted: true,
			});
			assert.strictEqual(contactedStatus, "CONTACTED");

			const bookedStatus = determineRecallStatus({
				dueDate,
				referenceDate: refDate,
				isBooked: true,
			});
			assert.strictEqual(bookedStatus, "BOOKED");

			const completedStatus = determineRecallStatus({
				dueDate,
				referenceDate: refDate,
				isCompleted: true,
			});
			assert.strictEqual(completedStatus, "COMPLETED");
		});

		it("enforces valid state machine transitions", () => {
			assert.strictEqual(canTransitionRecallStatus("PLANNED", "UPCOMING"), true);
			assert.strictEqual(canTransitionRecallStatus("UPCOMING", "DUE_NOW"), true);
			assert.strictEqual(canTransitionRecallStatus("DUE_NOW", "CONTACTED"), true);
			assert.strictEqual(canTransitionRecallStatus("CONTACTED", "BOOKED"), true);
			assert.strictEqual(canTransitionRecallStatus("BOOKED", "COMPLETED"), true);
			assert.strictEqual(canTransitionRecallStatus("COMPLETED", "PLANNED"), true); // Next cycle
			assert.strictEqual(canTransitionRecallStatus("DUE_NOW", "OVERDUE"), true);

			// Invalid direct transitions
			assert.strictEqual(canTransitionRecallStatus("COMPLETED", "OVERDUE"), false);
			assert.strictEqual(canTransitionRecallStatus("COMPLETED", "CONTACTED"), false);
		});
	});

	describe("3. Personalized Template Message Generator & Tag Substitution", () => {
		it("interpolates {{ИмяПациента}}, {{ИмяВрача}}, {{ПричинаВызова}}, {{СсылкаНаОнлайнЗапись}}", () => {
			const template =
				"Здравствуйте, {{ИмяПациента}}! Ваш лечащий врач {{ИмяВрача}} напоминает о визите. " +
				"Причина: {{ПричинаВызова}}. Записаться: {{СсылкаНаОнлайнЗапись}}";

			const rendered = renderRecallMessageTemplate(template, {
				patientName: "Алексей Смирнов",
				doctorName: "д-р Барабаш С.В.",
				recallReason: "Контрольный осмотр имплантов и КЛКТ",
				bookingUrl: "https://dente.clinic/b/smirnoff",
			});

			assert.ok(rendered.includes("Здравствуйте, Алексей Смирнов!"));
			assert.ok(rendered.includes("д-р Барабаш С.В."));
			assert.ok(rendered.includes("Контрольный осмотр имплантов и КЛКТ"));
			assert.ok(rendered.includes("https://dente.clinic/b/smirnoff"));
		});

		it("supports single braces and English variable names ({patientName}, {doctorName})", () => {
			const template =
				"Уважаемый {patientName}! Клиника {clinicName}. Доктор {doctorName} ждет вас: {bookingUrl}";

			const rendered = renderRecallMessageTemplate(template, {
				patientName: "Елена Кузнецова",
				clinicName: "DENTE VIP",
				doctorName: "Иванова М.А.",
				bookingUrl: "https://dente.clinic/b/kuznetsova",
			});

			assert.strictEqual(
				rendered,
				"Уважаемый Елена Кузнецова! Клиника DENTE VIP. Доктор Иванова М.А. ждет вас: https://dente.clinic/b/kuznetsova",
			);
		});

		it("handles whitespace and case tolerance in tags", () => {
			const template =
				"Привет, {{   имяпациента   }}! Запись на {{  ПРИЧИНА_ВЫЗОВА  }}: {{  ССЫЛКА_НА_ОНЛАЙН_ЗАПИСЬ  }}";

			const rendered = renderRecallMessageTemplate(template, {
				patientName: "Дмитрий",
				recallReason: "Air-Flow гигиена",
				bookingUrl: "https://dente.clinic/b/dmitry",
			});

			assert.strictEqual(
				rendered,
				"Привет, Дмитрий! Запись на Air-Flow гигиена: https://dente.clinic/b/dmitry",
			);
		});

		it("generates clinical messages for all major recall categories", () => {
			const hygieneMsg = generateRecallMessage({
				category: "hygiene_airflow",
				patientName: "Ольга Морозова",
				doctorName: "д-р Петров П.П.",
				bookingUrl: "https://dente.clinic/b/morozova",
				channel: "whatsapp",
			});

			assert.ok(hygieneMsg.title.includes("Профессиональная гигиена"));
			assert.ok(hygieneMsg.body.includes("Ольга Морозова"));
			assert.ok(hygieneMsg.body.includes("д-р Петров П.П."));
			assert.ok(hygieneMsg.body.includes("https://dente.clinic/b/morozova"));
			assert.strictEqual(hygieneMsg.channel, "whatsapp");

			const implantSms = generateRecallMessage({
				category: "implant_cbct_control",
				patientName: "Сергей Васильев",
				channel: "sms",
				bookingUrl: "https://dente.clinic/b/vasiliev",
			});

			assert.ok(implantSms.body.includes("Сергей Васильев"));
			assert.ok(implantSms.body.includes("имплант"));
			assert.strictEqual(implantSms.channel, "sms");
		});
	});

	describe("4. Record Schema Validation, Filtering & Cohort Metrics", () => {
		const sampleRecords: RecallDispensaryRecord[] = [
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				patientFullName: "Иванов Иван Иванович",
				category: "hygiene_airflow",
				treatmentCompletedDate: "2026-02-01",
				dueDate: "2026-08-01",
				daysOverdue: 0,
				status: "DUE_NOW",
				priority: "normal",
				preservesWarranty: true,
				requiresRadiologyCheck: false,
				contactAttemptsCount: 0,
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "33333333-3333-3333-3333-333333333333",
				patientFullName: "Петрова Анна Сергеевна",
				category: "implant_cbct_control",
				treatmentCompletedDate: "2025-06-01",
				dueDate: "2026-06-01", // >30 days overdue relative to 2026-08-20
				daysOverdue: 80,
				status: "OVERDUE",
				priority: "high",
				preservesWarranty: true,
				requiresRadiologyCheck: true,
				contactAttemptsCount: 1,
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "44444444-4444-4444-4444-444444444444",
				patientFullName: "Сидоров Олег Павлович",
				category: "ortho_activation",
				treatmentCompletedDate: "2026-08-01",
				dueDate: "2026-08-29", // within 14 days relative to 2026-08-20
				daysOverdue: -9,
				status: "UPCOMING",
				priority: "high",
				preservesWarranty: true,
				requiresRadiologyCheck: false,
				contactAttemptsCount: 0,
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "55555555-5555-5555-5555-555555555555",
				patientFullName: "Ковалева Мария Викторовна",
				category: "hygiene_airflow",
				treatmentCompletedDate: "2026-02-10",
				dueDate: "2026-08-10",
				daysOverdue: 10,
				status: "BOOKED",
				priority: "normal",
				preservesWarranty: true,
				requiresRadiologyCheck: false,
				contactAttemptsCount: 1,
			},
		];

		it("validates record schema using Zod", () => {
			const parsed = recallDispensaryRecordSchema.parse(sampleRecords[0]);
			assert.strictEqual(parsed.patientFullName, "Иванов Иван Иванович");
			assert.strictEqual(parsed.category, "hygiene_airflow");
		});

		it("filters due, upcoming, and overdue records correctly", () => {
			const refDate = "2026-08-20";

			const dueList = filterDueRecalls(sampleRecords, refDate);
			assert.strictEqual(dueList.length, 3); // 2026-08-01, 2026-06-01, 2026-08-10

			const upcomingList = filterUpcomingRecalls(sampleRecords, refDate);
			assert.strictEqual(upcomingList.length, 1);
			assert.strictEqual(upcomingList[0]?.patientFullName, "Сидоров Олег Павлович");

			const overdueList = filterOverdueRecalls(sampleRecords, refDate);
			assert.strictEqual(overdueList.length, 1);
			assert.strictEqual(overdueList[0]?.patientFullName, "Петрова Анна Сергеевна");
		});

		it("calculates accurate cohort metrics and retention rates", () => {
			const refDate = "2026-08-20";
			const metrics = calculateRecallCohortMetrics(sampleRecords, refDate);

			assert.strictEqual(metrics.totalCount, 4);
			assert.strictEqual(metrics.bookedCount, 1);
			assert.strictEqual(metrics.warrantyPreservationCount, 4);
			assert.strictEqual(metrics.conversionRatePercent, 25); // 1 booked out of 4 total = 25%
		});
	});

	describe("5. Date Arithmetic Utilities", () => {
		it("adds days and weeks accurately", () => {
			const base = "2026-01-01";
			assert.strictEqual(formatIsoDateOnly(addDaysSafe(base, 10)), "2026-01-11");
			assert.strictEqual(formatIsoDateOnly(addWeeksSafe(base, 4)), "2026-01-29");
		});

		it("handles invalid date gracefully", () => {
			assert.strictEqual(formatIsoDateOnly("invalid-date"), "");
			assert.ok(addCalendarMonthsSafe("invalid-date", 3) instanceof Date);
		});
	});
});
