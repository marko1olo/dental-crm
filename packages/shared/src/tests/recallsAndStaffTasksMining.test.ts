import assert from "node:assert";
import { describe, test } from "node:test";
import {
	calculateNextRecallDate,
	canTransitionRecallStatus,
	filterDueRecalls,
	formatRecallMessage,
	type RecallItem,
} from "../recalls/recallEngine.js";
import {
	canTransitionStaffTaskStatus,
	filterStaffTasks,
	isStaffTaskOverdue,
	type LegacyStaffTaskItem as StaffTaskItem,
} from "../staff/staffTasksEngine.js";
import {
	recallBandSchema,
	recallCandidateSchema,
	recallReportSchema,
	type RecallBand,
	type RecallCandidate,
	type RecallReport,
} from "../index.js";

describe("Dentalpin Mining: Recalls & Preventive Checkup Engine", () => {
	test("calculates next recall date for various clinical cadences", () => {
		const base = new Date("2026-03-01T10:00:00Z");

		// Hygiene recall: +180 days -> 2026-08-28
		const hygieneDate = calculateNextRecallDate(base, "hygiene_recall");
		assert.strictEqual(hygieneDate.toISOString().slice(0, 10), "2026-08-28");

		// Implant check: +90 days -> 2026-05-30
		const implantDate = calculateNextRecallDate(base, "implant_check");
		assert.strictEqual(implantDate.toISOString().slice(0, 10), "2026-05-30");

		// Ortho adjustment: +30 days -> 2026-03-31
		const orthoDate = calculateNextRecallDate(base, "ortho_adjustment");
		assert.strictEqual(orthoDate.toISOString().slice(0, 10), "2026-03-31");
	});

	test("filters due and overdue recalls accurately", () => {
		const recalls: RecallItem[] = [
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				patientFullName: "Иванов Иван",
				recallType: "hygiene_recall",
				dueDate: "2026-08-10",
				priority: "normal",
				status: "pending",
				contactAttemptCount: 0,
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "33333333-3333-3333-3333-333333333333",
				patientFullName: "Петрова Анна",
				recallType: "implant_check",
				dueDate: "2026-08-27",
				priority: "normal",
				status: "pending",
				contactAttemptCount: 0,
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "44444444-4444-4444-4444-444444444444",
				patientFullName: "Сидоров Олег",
				recallType: "ortho_adjustment",
				dueDate: "2026-09-15",
				priority: "normal",
				status: "pending",
				contactAttemptCount: 0,
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "55555555-5555-5555-5555-555555555555",
				patientFullName: "Смирнова Ольга",
				recallType: "hygiene_recall",
				dueDate: "2026-08-01",
				priority: "normal",
				status: "done", // Already done -> excluded
				contactAttemptCount: 0,
			},
		];

		const now = new Date("2026-08-27T12:00:00Z");
		const dueItems = filterDueRecalls(recalls, now, false);
		assert.strictEqual(dueItems.length, 2); // 2026-08-10 and 2026-08-27

		const overdueItems = filterDueRecalls(recalls, now, true);
		assert.strictEqual(overdueItems.length, 1); // 2026-08-10
		assert.strictEqual(overdueItems[0]?.patientFullName, "Иванов Иван");
	});

	test("formats personalized recall reminder message with clinical advice", () => {
		const recall: RecallItem = {
			organizationId: "11111111-1111-1111-1111-111111111111",
			patientId: "22222222-2222-2222-2222-222222222222",
			patientFullName: "Алексей Смирнов",
			recallType: "hygiene_recall",
			dueDate: "2026-08-27",
			priority: "normal",
			status: "pending",
			contactAttemptCount: 0,
		};


		const msg = formatRecallMessage(recall, "DENTE Стоматология");
		assert.ok(msg.title.includes("Профессиональная гигиена"));
		assert.ok(msg.bodyRu.includes("Здравствуйте, Алексей!"));
		assert.ok(msg.bodyRu.includes("DENTE Стоматология"));
		assert.ok(msg.bodyRu.includes("6 месяцев"));
	});

	test("enforces valid recall state transitions", () => {
		assert.strictEqual(canTransitionRecallStatus("pending", "contacted_scheduled"), true);
		assert.strictEqual(canTransitionRecallStatus("contacted_scheduled", "done"), true);
		assert.strictEqual(canTransitionRecallStatus("pending", "snoozed"), true);
		assert.strictEqual(canTransitionRecallStatus("done", "cancelled"), false);
	});
});

describe("Dentalpin Mining: Staff Tasks & Clinic Delegation Engine", () => {
	test("validates staff task state transitions", () => {
		assert.strictEqual(canTransitionStaffTaskStatus("pending", "in_progress"), true);
		assert.strictEqual(canTransitionStaffTaskStatus("in_progress", "completed"), true);
		assert.strictEqual(canTransitionStaffTaskStatus("completed", "pending"), true); // Reopening
		assert.strictEqual(canTransitionStaffTaskStatus("completed", "in_progress"), false);
	});

	test("identifies overdue tasks and filters by role & priority", () => {
		const tasks: StaffTaskItem[] = [
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				title: "Заказать карпулы Ультракаина",
				assignedRole: "nurse",
				priority: "urgent",
				status: "pending",
				dueDate: "2026-08-20",
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				title: "Перезвонить пациенту по поводу плана лечения",
				assignedRole: "administrator",
				priority: "normal",
				status: "pending",
				dueDate: "2026-08-30",
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				title: "Подготовить слепки для лаборатории",
				assignedRole: "nurse",
				priority: "normal",
				status: "completed",
				dueDate: "2026-08-15",
			},
		];

		const now = new Date("2026-08-27T10:00:00Z");

		assert.strictEqual(isStaffTaskOverdue(tasks[0]!, now), true);
		assert.strictEqual(isStaffTaskOverdue(tasks[1]!, now), false);
		assert.strictEqual(isStaffTaskOverdue(tasks[2]!, now), false); // Completed -> not overdue

		const nurseTasks = filterStaffTasks(tasks, { role: "nurse" }, now);
		assert.strictEqual(nurseTasks.length, 2);

		const urgentTasks = filterStaffTasks(tasks, { priority: "urgent" }, now);
		assert.strictEqual(urgentTasks.length, 1);
		assert.strictEqual(urgentTasks[0]?.title, "Заказать карпулы Ультракаина");

		const overdueNurseTasks = filterStaffTasks(tasks, { role: "nurse", overdueOnly: true }, now);
		assert.strictEqual(overdueNurseTasks.length, 1);
		assert.strictEqual(overdueNurseTasks[0]?.title, "Заказать карпулы Ультракаина");
	});

	test("validates canonical recallBandSchema, recallCandidateSchema, and recallReportSchema", () => {
		// Valid bands
		assert.strictEqual(recallBandSchema.parse("due"), "due");
		assert.strictEqual(recallBandSchema.parse("overdue"), "overdue");
		assert.strictEqual(recallBandSchema.parse("probably_lost"), "probably_lost");
		assert.strictEqual(recallBandSchema.parse("never_arrived"), "never_arrived");
		assert.throws(() => recallBandSchema.parse("unknown_band"));

		// Valid candidate with Date object transformed to ISO string
		const rawCandidateWithDate = {
			patientId: "patient-uuid-12345",
			fullName: "Барабаш Сергей Васильевич",
			phone: "+7 (999) 111-22-33",
			email: "barabash@example.com",
			lastCompletedAt: new Date("2026-03-24T10:00:00Z"),
			monthsSinceLastVisit: 6,
			band: "due" as RecallBand,
			reason: "Полгода без осмотра — пора на профилактику.",
		};
		const parsedWithDate: RecallCandidate = recallCandidateSchema.parse(rawCandidateWithDate);
		assert.strictEqual(parsedWithDate.lastCompletedAt, "2026-03-24T10:00:00.000Z");
		assert.strictEqual(parsedWithDate.band, "due");

		// Valid candidate with ISO string date
		const rawCandidateWithString = {
			patientId: "patient-uuid-67890",
			fullName: "Смирнова Елена Александровна",
			phone: null,
			email: null,
			lastCompletedAt: "2025-09-01T12:00:00.000Z",
			monthsSinceLastVisit: 12,
			band: "overdue" as RecallBand,
			reason: "Больше года не был: пропущен как минимум один осмотр.",
		};
		const parsedWithString: RecallCandidate = recallCandidateSchema.parse(rawCandidateWithString);
		assert.strictEqual(parsedWithString.lastCompletedAt, "2025-09-01T12:00:00.000Z");
		assert.strictEqual(parsedWithString.band, "overdue");

		// Never arrived candidate (lastCompletedAt is null, monthsSinceLastVisit is null)
		const rawNeverArrived = {
			patientId: "patient-uuid-11111",
			fullName: "Кузнецов Дмитрий Павлович",
			phone: "+7 (916) 555-44-33",
			email: null,
			lastCompletedAt: null,
			monthsSinceLastVisit: null,
			band: "never_arrived" as RecallBand,
			reason: "Записывался, но ни разу не дошёл до кресла.",
		};
		const parsedNeverArrived = recallCandidateSchema.parse(rawNeverArrived);
		assert.strictEqual(parsedNeverArrived.lastCompletedAt, null);
		assert.strictEqual(parsedNeverArrived.monthsSinceLastVisit, null);
		assert.strictEqual(parsedNeverArrived.band, "never_arrived");

		// Valid recall report
		const rawReport = {
			candidates: [parsedWithDate, parsedWithString, parsedNeverArrived],
			byBand: {
				due: 1,
				overdue: 1,
				probably_lost: 0,
				never_arrived: 1,
			},
			examinedPatients: 42,
			note: "Список считается по текущим данным при каждом запросе.",
		};
		const report: RecallReport = recallReportSchema.parse(rawReport);
		assert.strictEqual(report.candidates.length, 3);
		assert.strictEqual(report.byBand.due, 1);
		assert.strictEqual(report.byBand.overdue, 1);
		assert.strictEqual(report.byBand.probably_lost, 0);
		assert.strictEqual(report.byBand.never_arrived, 1);
		assert.strictEqual(report.examinedPatients, 42);
	});
});
