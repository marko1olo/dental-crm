/**
 * packages/shared/src/staff/__tests__/wave137StaffTasks.test.ts
 *
 * WAVE 137: Production Staff Tasks & Clinical Assignment Engine Tests.
 * Adapted from DentalPin (staff_tasks module) for DENTE Dental CRM.
 *
 * 100% Zero Mocks. Validates:
 * 1. Task Lifecycle (open -> claimed -> in_progress -> done) with completion evidence.
 * 2. SLA computation and overdue detection ('on_track', 'warning', 'overdue').
 * 3. Automated clinical event triggers: lab order delivery, autoclave completion, low inventory, overdue recall.
 * 4. Statutory A4 daily log protocol and strict 100% absence of cartoon emojis (Mandate 8d item 7).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	staffTaskStatusSchema,
	staffTaskPrioritySchema,
	staffTaskCategorySchema,
	staffTaskRoleSchema,
	staffTaskItemSchema,
	validateTaskStatusTransition,
	transitionTaskStatus,
	claimStaffTask,
	computeTaskSlaStatus,
	createTriggeredStaffTask,
	formatStaffTasksDailyLogA4,
	STAFF_TASK_STATUS_LABELS_RU,
	STAFF_TASK_PRIORITY_LABELS_RU,
	STAFF_TASK_CATEGORY_LABELS_RU,
	STAFF_TASK_ROLE_LABELS_RU,
	type StaffTaskItem,
} from "../staffTasksEngine.js";

describe("Wave 137: Staff Tasks & Clinical Assignment Engine", () => {
	const mockClinicId = "clinic-dent-spb-01";
	const baseNowIso = "2026-09-12T10:00:00.000Z";

	const createBaseTask = (): StaffTaskItem => ({
		id: "task-test-101",
		clinicId: mockClinicId,
		title: "Подготовить операционную к установке имплантата Straumann",
		details: "Стерильный стол №1, физраствор 500 мл, хирургический наконечник W&H 20:1.",
		category: "clinical",
		priority: "high",
		status: "open",
		assignedRole: "nurse",
		assigneeId: null,
		assigneeName: null,
		createdById: "doc-ivanov",
		createdByName: "Д-р Иванов А.С.",
		patientId: "pat-12345",
		dueDate: "2026-09-12T12:00:00.000Z",
		slaMinutes: 120,
		completedAt: null,
		completedEvidence: null,
		createdAt: baseNowIso,
		updatedAt: baseNowIso,
	});

	// ========================================================================
	// 1. SCHEMAS & DICTIONARIES
	// ========================================================================
	describe("1. Schemas, Validation & Localization Dictionaries", () => {
		it("validates valid task item against Zod schema", () => {
			const task = createBaseTask();
			const parsed = staffTaskItemSchema.parse(task);
			assert.equal(parsed.id, "task-test-101");
			assert.equal(parsed.status, "open");
			assert.equal(parsed.priority, "high");
			assert.equal(parsed.assignedRole, "nurse");
		});

		it("rejects invalid status or priority values", () => {
			assert.throws(() => staffTaskStatusSchema.parse("invalid_status"));
			assert.throws(() => staffTaskPrioritySchema.parse("critical_super_urgent"));
			assert.throws(() => staffTaskCategorySchema.parse("space_exploration"));
			assert.throws(() => staffTaskRoleSchema.parse("astronaut"));
		});

		it("provides complete Russian localization dictionaries for all enum states", () => {
			for (const status of ["open", "claimed", "in_progress", "done", "cancelled"] as const) {
				assert.ok(STAFF_TASK_STATUS_LABELS_RU[status], `Missing RU label for status ${status}`);
			}
			for (const priority of ["low", "normal", "high", "urgent"] as const) {
				assert.ok(STAFF_TASK_PRIORITY_LABELS_RU[priority], `Missing RU label for priority ${priority}`);
			}
			for (const cat of ["clinical", "reception", "sterilization", "lab", "inventory", "equipment"] as const) {
				assert.ok(STAFF_TASK_CATEGORY_LABELS_RU[cat], `Missing RU label for category ${cat}`);
			}
			for (const role of ["doctor", "assistant", "nurse", "admin", "all"] as const) {
				assert.ok(STAFF_TASK_ROLE_LABELS_RU[role], `Missing RU label for role ${role}`);
			}
		});
	});

	// ========================================================================
	// 2. TASK LIFECYCLE & TRANSITIONS
	// ========================================================================
	describe("2. Task Lifecycle & Status State Machine", () => {
		it("progresses correctly through open -> claimed -> in_progress -> done with evidence", () => {
			const initialTask = createBaseTask();
			assert.equal(initialTask.status, "open");
			assert.equal(initialTask.assigneeId, null);

			// Step 1: Claim task by assistant
			const claimedTask = claimStaffTask(
				initialTask,
				"nurse-petrova",
				"Петрова Е.Н.",
				"2026-09-12T10:10:00.000Z",
			);
			assert.equal(claimedTask.status, "claimed");
			assert.equal(claimedTask.assigneeId, "nurse-petrova");
			assert.equal(claimedTask.assigneeName, "Петрова Е.Н.");
			assert.equal(claimedTask.updatedAt, "2026-09-12T10:10:00.000Z");

			// Step 2: Start execution (claimed -> in_progress)
			const inProgressTask = transitionTaskStatus(claimedTask, "in_progress", {
				now: "2026-09-12T10:15:00.000Z",
			});
			assert.equal(inProgressTask.status, "in_progress");
			assert.equal(inProgressTask.assigneeId, "nurse-petrova");

			// Step 3: Complete task (in_progress -> done) with evidence
			const doneTask = transitionTaskStatus(inProgressTask, "done", {
				completedEvidence: "Стол №1 накрыт, стерильный лоток проверен, наконечник смазан и подключен.",
				now: "2026-09-12T10:45:00.000Z",
			});
			assert.equal(doneTask.status, "done");
			assert.equal(doneTask.completedAt, "2026-09-12T10:45:00.000Z");
			assert.equal(
				doneTask.completedEvidence,
				"Стол №1 накрыт, стерильный лоток проверен, наконечник смазан и подключен.",
			);
		});

		it("allows re-opening completed or cancelled tasks", () => {
			const task = createBaseTask();
			const doneTask = transitionTaskStatus(task, "done", {
				completedEvidence: "Выполнено",
				now: "2026-09-12T10:30:00.000Z",
			});
			assert.equal(doneTask.status, "done");

			const reopened = transitionTaskStatus(doneTask, "open", {
				now: "2026-09-12T10:35:00.000Z",
			});
			assert.equal(reopened.status, "open");
			assert.equal(reopened.completedAt, null);
			assert.equal(reopened.completedEvidence, null);
			assert.equal(reopened.assigneeId, null);
		});

		it("blocks invalid transitions (e.g. done -> in_progress or cancelled -> in_progress directly)", () => {
			const task = createBaseTask();
			const doneTask = transitionTaskStatus(task, "done");

			assert.equal(validateTaskStatusTransition("done", "in_progress"), false);
			assert.throws(() => transitionTaskStatus(doneTask, "in_progress"), /Недопустимый переход статуса/);

			const cancelledTask = transitionTaskStatus(task, "cancelled");
			assert.equal(validateTaskStatusTransition("cancelled", "claimed"), false);
			assert.throws(() => transitionTaskStatus(cancelledTask, "claimed"), /Недопустимый переход статуса/);
		});

		it("throws when trying to claim a done or cancelled task", () => {
			const task = createBaseTask();
			const doneTask = transitionTaskStatus(task, "done");
			assert.throws(
				() => claimStaffTask(doneTask, "emp-1", "Сидоров В.В."),
				/Невозможно взять в работу задачу в статусе "Выполнена"/,
			);
		});
	});

	// ========================================================================
	// 3. SLA COMPUTATION & OVERDUE DETECTION
	// ========================================================================
	describe("3. SLA Computation & Overdue Detection", () => {
		it("evaluates on_track when current time is well before deadline", () => {
			const task = createBaseTask(); // Due at 12:00:00
			const status = computeTaskSlaStatus(task, "2026-09-12T10:00:00.000Z"); // 2 hours prior
			assert.equal(status, "on_track");
		});

		it("evaluates warning when remaining time is less than 30 minutes", () => {
			const task = createBaseTask(); // Due at 12:00:00
			const status = computeTaskSlaStatus(task, "2026-09-12T11:45:00.000Z"); // 15 mins left
			assert.equal(status, "warning");
		});

		it("evaluates overdue when deadline has passed for active task", () => {
			const task = createBaseTask(); // Due at 12:00:00
			const status = computeTaskSlaStatus(task, "2026-09-12T12:01:00.000Z"); // 1 min overdue
			assert.equal(status, "overdue");
		});

		it("evaluates overdue if task was completed AFTER deadline", () => {
			const task = createBaseTask(); // Due at 12:00:00
			const lateTask = transitionTaskStatus(task, "done", {
				completedEvidence: "Запоздали из-за поломки",
				now: "2026-09-12T12:15:00.000Z",
			});
			const status = computeTaskSlaStatus(lateTask, "2026-09-12T13:00:00.000Z");
			assert.equal(status, "overdue");
		});

		it("evaluates on_track if task was completed on time even if checked later", () => {
			const task = createBaseTask(); // Due at 12:00:00
			const timelyTask = transitionTaskStatus(task, "done", {
				completedEvidence: "Успели вовремя",
				now: "2026-09-12T11:50:00.000Z",
			});
			const status = computeTaskSlaStatus(timelyTask, "2026-09-12T15:00:00.000Z");
			assert.equal(status, "on_track");
		});

		it("evaluates on_track for cancelled tasks", () => {
			const task = createBaseTask();
			const cancelledTask = transitionTaskStatus(task, "cancelled");
			const status = computeTaskSlaStatus(cancelledTask, "2026-09-12T15:00:00.000Z");
			assert.equal(status, "on_track");
		});
	});

	// ========================================================================
	// 4. AUTOMATED CLINICAL TRIGGERS
	// ========================================================================
	describe("4. Automated Clinical Event Triggers", () => {
		it("creates high-priority task for reception when lab order is received", () => {
			const triggerTask = createTriggeredStaffTask(
				{
					trigger: "lab_order_received",
					clinicId: mockClinicId,
					patientId: "pat-900",
					patientName: "Ковалев Дмитрий Андреевич",
					patientPhone: "+7 (999) 111-22-33",
					orderId: "LAB-2026-0814",
					workTypeTitle: "Циркониевая коронка 16",
					labName: "ЗТЛ ОртоДент",
					createdById: "tech-lab",
					createdByName: "Курьер ЗТЛ",
				},
				baseNowIso,
			);

			assert.equal(triggerTask.category, "reception");
			assert.equal(triggerTask.assignedRole, "admin");
			assert.equal(triggerTask.priority, "high");
			assert.equal(triggerTask.status, "open");
			assert.equal(triggerTask.patientId, "pat-900");
			assert.equal(triggerTask.slaMinutes, 120);
			assert.ok(triggerTask.title.includes("Ковалев Дмитрий Андреевич"));
			assert.ok(triggerTask.title.includes("Циркониевая коронка 16"));
			assert.ok(triggerTask.details?.includes("+7 (999) 111-22-33"));
			assert.ok(triggerTask.details?.includes("ЗТЛ ОртоДент"));
		});

		it("creates nurse task when autoclave sterilization cycle is complete", () => {
			const triggerTask = createTriggeredStaffTask(
				{
					trigger: "sterilization_cycle_complete",
					clinicId: mockClinicId,
					autoclaveId: "auto-01",
					autoclaveName: "Melag Euroklav 23 VS+",
					cycleNumber: 428,
					programName: "Универсальная 134 C",
				},
				baseNowIso,
			);

			assert.equal(triggerTask.category, "sterilization");
			assert.equal(triggerTask.assignedRole, "nurse");
			assert.equal(triggerTask.priority, "high");
			assert.equal(triggerTask.slaMinutes, 30);
			assert.ok(triggerTask.title.includes("цикл автоклава №428"));
			assert.ok(triggerTask.title.includes("Melag Euroklav 23 VS+"));
			assert.ok(triggerTask.details?.includes("азопирамовую пробу"));
			assert.ok(triggerTask.details?.includes("СанПиН 3.3686-21"));
		});

		it("creates urgent procurement task when warehouse inventory reaches critical low threshold", () => {
			const triggerTask = createTriggeredStaffTask(
				{
					trigger: "inventory_low_stock",
					clinicId: mockClinicId,
					itemId: "item-septanest-100",
					itemName: "Септанест 1:100 000 с адреналином (1.7 мл)",
					currentQuantity: 8,
					minThreshold: 20,
					unit: "карпул",
				},
				baseNowIso,
			);

			assert.equal(triggerTask.category, "inventory");
			assert.equal(triggerTask.assignedRole, "nurse");
			assert.equal(triggerTask.priority, "urgent");
			assert.equal(triggerTask.slaMinutes, 240);
			assert.ok(triggerTask.title.includes("Септанест 1:100 000"));
			assert.ok(triggerTask.details?.includes("8 карпул"));
			assert.ok(triggerTask.details?.includes("20 карпул"));
		});

		it("creates recall call task for administration when patient recall is overdue by > 14 days", () => {
			const triggerTask = createTriggeredStaffTask(
				{
					trigger: "overdue_patient_recall",
					clinicId: mockClinicId,
					patientId: "pat-555",
					patientName: "Васильева Елена Сергеевна",
					patientPhone: "+7 (911) 777-88-99",
					daysOverdue: 21,
					lastVisitDate: "2026-02-15",
					recommendedProcedure: "Контрольный осмотр и профессиональная гигиена",
				},
				baseNowIso,
			);

			assert.equal(triggerTask.category, "reception");
			assert.equal(triggerTask.assignedRole, "admin");
			assert.equal(triggerTask.priority, "normal");
			assert.equal(triggerTask.slaMinutes, 480);
			assert.ok(triggerTask.title.includes("Васильева Елена Сергеевна"));
			assert.ok(triggerTask.title.includes("просрочка 21 дн."));
			assert.ok(triggerTask.details?.includes("2026-02-15"));
		});
	});

	// ========================================================================
	// 5. STATUTORY A4 LOG & ZERO EMOJIS AUDIT (MANDATE 8d ITEM 7)
	// ========================================================================
	describe("5. Statutory A4 Daily Log & Zero Emojis Verification", () => {
		it("generates comprehensive statutory A4 protocol with metrics, tasks, and sign-off blocks", () => {
			const task1 = createBaseTask();
			const task2 = createTriggeredStaffTask(
				{
					trigger: "lab_order_received",
					clinicId: mockClinicId,
					patientId: "pat-900",
					patientName: "Ковалев Д.А.",
					orderId: "LAB-112",
					workTypeTitle: "Коронка E.max 21",
					labName: "Дентал-Мастер",
				},
				baseNowIso,
			);
			const completedTask1 = transitionTaskStatus(task1, "done", {
				completedEvidence: "Кабинет №1 укомплектован и проверен.",
				now: "2026-09-12T11:00:00.000Z",
			});

			const log = formatStaffTasksDailyLogA4({
				clinicName: "ООО «ДЕНТЕ Стоматология на Невском»",
				date: "2026-09-12",
				tasks: [completedTask1, task2],
				signedBy: "Старшая медсестра Сидорова М.В.",
				now: "2026-09-12T11:30:00.000Z",
			});

			assert.ok(log.includes("ЖУРНАЛ УЧЕТА ПРОИЗВОДСТВЕННЫХ ЗАДАЧ И ПОРУЧЕНИЙ ПЕРСОНАЛА"));
			assert.ok(log.includes("ООО «ДЕНТЕ Стоматология на Невском»"));
			assert.ok(log.includes("Дата смены:  2026-09-12"));
			assert.ok(log.includes("Всего зарегистрировано задач: 2"));
			assert.ok(log.includes("Выполнено:                  1"));
			assert.ok(log.includes("Открыто (ожидают захвата):  1"));
			assert.ok(log.includes("Кабинет №1 укомплектован и проверен."));
			assert.ok(log.includes("Старшая медсестра Сидорова М.В."));
			assert.ok(log.includes("[ М.П. ]"));
		});

		it("STRICT MANDATE 8d ITEM 7 AUDIT: Guarantees 100% absence of cartoon emojis in official document", () => {
			const sampleTasks: StaffTaskItem[] = [
				createBaseTask(),
				createTriggeredStaffTask({
					trigger: "sterilization_cycle_complete",
					clinicId: mockClinicId,
					autoclaveId: "auto-1",
					autoclaveName: "Melag 23",
					cycleNumber: 501,
				}),
				createTriggeredStaffTask({
					trigger: "inventory_low_stock",
					clinicId: mockClinicId,
					itemId: "i-1",
					itemName: "Ультракаин Д-С форте",
					currentQuantity: 5,
					minThreshold: 20,
					unit: "карпул",
				}),
			];

			const log = formatStaffTasksDailyLogA4({
				clinicName: "Клиника Стоматологии «ДЕНТЕ»",
				date: "2026-09-12",
				tasks: sampleTasks,
				signedBy: "Администратор Смирнова А.В.",
				now: "2026-09-12T12:00:00.000Z",
			});

			// 1. Unicode Extended_Pictographic check
			const unicodeEmojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(
				unicodeEmojiRegex.test(log),
				false,
				"Mandate 8d Item 7 Violation: Detected Extended_Pictographic Unicode emoji in staff tasks A4 log!",
			);

			// 2. Comprehensive range check for standard emoji symbols
			const generalEmojiRegex =
				/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
			assert.equal(
				generalEmojiRegex.test(log),
				false,
				"Mandate 8d Item 7 Violation: Detected standard Unicode emoji range in staff tasks A4 log!",
			);

			// 3. Explicit check for common medical/cartoon emojis
			const forbiddenList = ["🎉", "🚀", "💡", "🦷", "📦", "📄", "⚠️", "🚨", "✅", "❌", "🔥"];
			for (const forbidden of forbiddenList) {
				assert.equal(
					log.includes(forbidden),
					false,
					`Mandate 8d Item 7 Violation: Explicit emoji ${forbidden} found in staff tasks A4 log!`,
				);
			}
		});
	});
});
