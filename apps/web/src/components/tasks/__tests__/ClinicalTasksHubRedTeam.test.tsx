import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ClinicalTasksTable } from "../ClinicalTasksTable";
import {
	CLINICAL_TASK_PRESETS,
	countTasksByDeadline,
	filterTasksByDeadline,
	getTaskDeadlineCategory,
} from "../clinicalTasksPresets";
import type { ClinicalTask } from "../clinicalTasksTypes";

describe("ClinicalTasksHubRedTeam — Ergonomic Clinical Tasks Hub, Apple HIG & Doctor Autonomy", () => {
	const now = new Date();
	const overdueDate = new Date(now.getTime() - 2 * 86400000).toISOString();
	const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0).toISOString();
	const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0, 0).toISOString();
	const nextWeekDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 10, 0, 0).toISOString();

	const mockTasks: ClinicalTask[] = [
		{
			id: "task-overdue-1",
			organizationId: "org-1",
			patientId: "pat-1",
			patientName: "Ковалев А.В.",
			treatmentPlanId: null,
			assignedDoctorId: "doc-1",
			taskType: "custom_reminder",
			status: "pending",
			title: "Забрать коронку из лаборатории",
			description: "Коронка из диоксида циркония на 26 зуб",
			dueAt: overdueDate,
			createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
		},
		{
			id: "task-today-1",
			organizationId: "org-1",
			patientId: "pat-1",
			patientName: "Ковалев А.В.",
			treatmentPlanId: null,
			assignedDoctorId: "doc-1",
			taskType: "postop_call",
			status: "pending",
			title: "Контрольный звонок после удаления",
			description: "Оценить самочувствие после сложного удаления 38 зуба",
			dueAt: todayDate,
			createdAt: new Date().toISOString(),
		},
		{
			id: "task-tomorrow-1",
			organizationId: "org-1",
			patientId: "pat-2",
			patientName: "Смирнова Е.П.",
			treatmentPlanId: null,
			assignedDoctorId: "doc-1",
			taskType: "order_implant",
			status: "in_progress",
			title: "Заказать имплантат и костный материал",
			description: "Имплантат 4.0x10 мм + гранулы Bio-Oss",
			dueAt: tomorrowDate,
			createdAt: new Date().toISOString(),
		},
		{
			id: "task-completed-1",
			organizationId: "org-1",
			patientId: "pat-1",
			patientName: "Ковалев А.В.",
			treatmentPlanId: null,
			assignedDoctorId: "doc-1",
			taskType: "recall_hygiene",
			status: "completed",
			title: "Пригласить на профгигиену",
			description: "Контроль через 6 месяцев",
			dueAt: overdueDate, // дата в прошлом, но задача выполнена!
			createdAt: new Date(now.getTime() - 100 * 86400000).toISOString(),
		},
	];

	it("1. Accurately calculates deadline categories and counters (overdue, today, tomorrow)", () => {
		assert.strictEqual(getTaskDeadlineCategory(overdueDate), "overdue");
		assert.strictEqual(getTaskDeadlineCategory(todayDate), "today");
		assert.strictEqual(getTaskDeadlineCategory(tomorrowDate), "tomorrow");
		assert.strictEqual(getTaskDeadlineCategory(nextWeekDate), "upcoming");
		assert.strictEqual(getTaskDeadlineCategory(null), "no_due");

		const counts = countTasksByDeadline(mockTasks);
		assert.strictEqual(counts.all, 4, "Total tasks must be 4");
		assert.strictEqual(counts.overdue, 1, "Only open overdue task must count (completed task must not trigger panic)");
		assert.strictEqual(counts.today, 1, "Today count must be 1");
		assert.strictEqual(counts.tomorrow, 1, "Tomorrow count must be 1");
	});

	it("2. Filters tasks by deadline category correctly", () => {
		const overdueTasks = filterTasksByDeadline(mockTasks, "overdue");
		assert.strictEqual(overdueTasks.length, 2, "2 tasks had past due dates (1 pending, 1 completed)");

		const todayTasks = filterTasksByDeadline(mockTasks, "today");
		assert.strictEqual(todayTasks.length, 1);
		assert.strictEqual(todayTasks[0]?.id, "task-today-1");

		const tomorrowTasks = filterTasksByDeadline(mockTasks, "tomorrow");
		assert.strictEqual(tomorrowTasks.length, 1);
		assert.strictEqual(tomorrowTasks[0]?.id, "task-tomorrow-1");

		const allTasks = filterTasksByDeadline(mockTasks, "all");
		assert.strictEqual(allTasks.length, 4);
	});

	it("3. Renders deadline filter chips and quick task action without disabled buttons", () => {
		const html = renderToString(
			<ClinicalTasksTable
				visibleTasks={mockTasks}
				completingTaskId={null}
				onCompleteTask={() => {}}
				patientId="pat-1"
				patientName="Ковалев А.В."
			/>,
		);

		assert.ok(html.includes('data-testid="clinical-tasks-hub"'), "Must render clinical tasks hub");
		assert.ok(html.includes('data-testid="filter-deadline-all"'), "Must render 'Все' filter chip");
		assert.ok(html.includes('data-testid="filter-deadline-today"'), "Must render 'Сегодня' filter chip");
		assert.ok(html.includes('data-testid="filter-deadline-tomorrow"'), "Must render 'Завтра' filter chip");
		assert.ok(html.includes('data-testid="filter-deadline-overdue"'), "Must render 'Просрочено' filter chip");
		assert.ok(html.includes('data-testid="btn-add-quick-task"'), "Must render '+ Новая задача' action button");

		// Check 1-click completion action in table
		assert.ok(html.includes('data-testid="btn-complete-task-task-overdue-1"'), "Must render 1-click complete button");
		assert.ok(html.includes("Выполнено"), "Must render 'Выполнено' action label");

		// Mandate 8e: Zero disabled buttons
		assert.ok(!html.includes('disabled=""'), "No button must be disabled");
	});

	it("4. Complies with Apple HIG for mobile view: Grouped List Cards and 44x44px touch targets", () => {
		const html = renderToString(
			<ClinicalTasksTable
				visibleTasks={mockTasks}
				completingTaskId={null}
				onCompleteTask={() => {}}
				patientId="pat-1"
				patientName="Ковалев А.В."
			/>,
		);

		assert.ok(
			html.includes('data-testid="clinical-tasks-mobile-cards"'),
			"Must render mobile grouped list cards container",
		);
		assert.ok(
			html.includes('data-testid="mobile-task-card-task-overdue-1"'),
			"Must render mobile task card",
		);
		assert.ok(
			html.includes('data-testid="mobile-checkbox-task-overdue-1"'),
			"Must render mobile checkbox",
		);

		// Verify 44x44px minimum touch target on mobile checkbox
		assert.ok(
			html.includes("min-width:44px") && html.includes("min-height:44px"),
			"Mobile touch target must be at least 44x44px",
		);

		// Verify row height >= 52px (min-height: 56px)
		assert.ok(
			html.includes("min-height:56px"),
			"Mobile card height must be >= 52px (Apple HIG grouped list standard)",
		);
	});

	it("5. Complies with Mandate 8d p. 7 (Zero cartoon emojis in tasks hub)", () => {
		const html = renderToString(
			<ClinicalTasksTable
				visibleTasks={mockTasks}
				completingTaskId={null}
				onCompleteTask={() => {}}
				patientId="pat-1"
				patientName="Ковалев А.В."
			/>,
		);

		const forbiddenEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!forbiddenEmojis.test(html), "ClinicalTasksTable must contain 0 cartoon emojis");
	});

	it("6. Contains all required clinical presets (implants, ZTL, postop call, hygiene, CT)", () => {
		const postop = CLINICAL_TASK_PRESETS.find((p) => p.id === "preset-postop-call");
		assert.ok(postop, "Postop call preset must exist");
		assert.ok(postop.title.includes("Контрольный звонок"), "Postop title must be correct");

		const implant = CLINICAL_TASK_PRESETS.find((p) => p.id === "preset-order-implant");
		assert.ok(implant, "Implant order preset must exist");
		assert.ok(implant.label.includes("Заказать имплантат"), "Implant label must mention implant/bone");

		const ztl = CLINICAL_TASK_PRESETS.find((p) => p.id === "preset-prosthetics-ztl");
		assert.ok(ztl, "ZTL preset must exist");
		assert.ok(ztl.label.includes("лаборатории") || ztl.title.includes("лаборатории"), "ZTL must mention laboratory");

		const recall = CLINICAL_TASK_PRESETS.find((p) => p.id === "preset-recall-6m");
		assert.ok(recall, "Recall preset must exist");
		assert.ok(recall.label.includes("профгигиен") || recall.title.includes("профгигиен"), "Recall must mention hygiene");

		const ct = CLINICAL_TASK_PRESETS.find((p) => p.id === "preset-ct-planning");
		assert.ok(ct, "CT preset must exist");
		assert.ok(ct.label.includes("КТ/ОПТГ"), "CT label must mention CT/OPTG");
	});
});
