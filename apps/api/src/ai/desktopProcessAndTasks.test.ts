/**
 * desktopProcessAndTasks.test.ts — Тестирование выполнения процессов, менеджера задач и планировщика:
 * 1. run_workstation_command: синхронный возврат быстрых команд, авто-переход в фон по WaitMsBeforeAsync.
 * 2. manage_task: list, status, kill, send_input для фоновых процессов.
 * 3. schedule: однократный таймер, cron-расписание, раннее пробуждение по завершению задачи.
 *
 * Sweet Spot 200-300 строк (Мандат 8b / 8zi).
 */

import assert from "node:assert/strict";
import test, { beforeEach, describe } from "node:test";
import {
	handleManageTask,
	handleRunWorkstationCommand,
	handleSchedule,
	workstationSchedules,
	workstationTasks,
} from "./dentalTools/desktopSystemTools.js";
import type { DentalToolContext } from "./dentalTools/types.js";

const TEST_ORG_ID = "org-test-7777-8888-9999-000000000000";
const TEST_PATIENT_ID = "11111111-2222-3333-4444-555555555555";

const DESKTOP_CTX: DentalToolContext = {
	organizationId: TEST_ORG_ID,
	patientId: TEST_PATIENT_ID,
	runtimeMode: "desktop_native",
	allowLocalExecution: true,
};

describe("Desktop Agent Harness — Процессы и Менеджер Задач (Task Engine)", () => {
	beforeEach(() => {
		workstationTasks.clear();
	});

	test("run_workstation_command: синхронное выполнение быстрой команды", async () => {
		const res = (await handleRunWorkstationCommand(
			{
				commandLine:
					"node -e \"console.log('DENTE_HARNESS_SYNCHRONOUS_PASS')\"",
				diagnosticTarget: "custom",
				waitMsBeforeAsync: 5000,
				isDaemon: false,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.status, "completed");
		assert.strictEqual(res.exitCode, 0);
		assert.ok(res.stdout.includes("DENTE_HARNESS_SYNCHRONOUS_PASS"));
	});

	test("run_workstation_command: авто-переход в фоновый режим по таймауту WaitMsBeforeAsync", async () => {
		// Команда работает 1500 мс, а таймаут синхронности 250 мс
		const res = (await handleRunWorkstationCommand(
			{
				commandLine:
					"node -e \"setTimeout(() => console.log('LATE_LOG'), 1500)\"",
				diagnosticTarget: "custom",
				waitMsBeforeAsync: 250,
				isDaemon: false,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.status, "background");
		assert.ok(res.taskId);
		assert.ok(res.pid > 0);

		// Проверяем наличие задачи в WorkstationTaskManager
		const tasks = workstationTasks.list();
		assert.ok(tasks.some((t) => t.taskId === res.taskId));

		// Очищаем фоновый процесс
		workstationTasks.kill(res.taskId);
	});

	test("manage_task: list, status, kill и send_input", async () => {
		// Запускаем интерактивный процесс Node.js
		const startRes = (await handleRunWorkstationCommand(
			{
				commandLine:
					"node -e \"process.stdin.on('data', d => { if (d.toString().trim() === 'exit') process.exit(0); }); setInterval(() => {}, 1000);\"",
				waitMsBeforeAsync: 200,
				isDaemon: true,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(startRes.success, true);
		const taskId = startRes.taskId;

		// 1. Action: list
		const listRes = (await handleManageTask(
			{ action: "list" },
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(listRes.success, true);
		assert.ok(listRes.tasks.some((t: any) => t.taskId === taskId));

		// 2. Action: status
		const statusRes = (await handleManageTask(
			{ action: "status", taskId },
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(statusRes.success, true);
		assert.strictEqual(statusRes.task.taskId, taskId);
		assert.strictEqual(statusRes.task.status, "running");

		// 3. Action: send_input
		const inputRes = (await handleManageTask(
			{ action: "send_input", taskId, input: "ping_stdin" },
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(inputRes.success, true);

		// 4. Action: kill
		const killRes = (await handleManageTask(
			{ action: "kill", taskId },
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(killRes.success, true);

		const finalStatus = (await handleManageTask(
			{ action: "status", taskId },
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(finalStatus.task.status, "killed");
	});
});

describe("Desktop Agent Harness — Планировщик Таймеров (Schedule Engine)", () => {
	beforeEach(() => {
		workstationSchedules.clear();
	});

	test("schedule: установка однократного таймера durationSeconds", async () => {
		const res = (await handleSchedule(
			{
				prompt: "Напомнить врачу проверить результаты КЛКТ 3D",
				durationSeconds: 30,
				timerCondition: "never",
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.mode, "one_shot");
		assert.strictEqual(res.durationSeconds, 30);
		assert.ok(res.scheduleId);
		assert.ok(res.firesAtIso);

		const list = workstationSchedules.list();
		assert.ok(list.some((s) => s.scheduleId === res.scheduleId));
	});

	test("schedule: установка периодического cron-расписания", async () => {
		const res = (await handleSchedule(
			{
				prompt: "Регламентная калибровка датчика визиографа",
				cronExpression: "0 9 * * *",
				maxIterations: 5,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.mode, "cron");
		assert.strictEqual(res.cronExpression, "0 9 * * *");
	});

	test("schedule: раннее пробуждение (early_cancelled) при завершении целевой задачи taskId", async () => {
		const targetTaskId = "task-dent-mock-12345";
		const sched = (await handleSchedule(
			{
				prompt: "Ждем завершения тяжелого импорта снимков КЛКТ",
				durationSeconds: 300,
				timerCondition: targetTaskId,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(sched.success, true);
		assert.strictEqual(sched.timerCondition, targetTaskId);

		// Симулируем завершение задачи targetTaskId
		const cancelled = workstationSchedules.notifyTaskFinished(targetTaskId);
		assert.ok(cancelled.includes(sched.scheduleId));

		const found = workstationSchedules
			.list()
			.find((s) => s.scheduleId === sched.scheduleId);
		assert.ok(found);
		assert.strictEqual(found.status, "early_cancelled");
	});

	test("schedule: валидация взаимоисключающих параметров", async () => {
		// Ничего не передано
		const emptyRes = (await handleSchedule(
			{
				prompt: "Пустой таймер",
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(emptyRes.success, false);

		// Передано и то, и другое
		const bothRes = (await handleSchedule(
			{
				prompt: "Конфликтный таймер",
				durationSeconds: 60,
				cronExpression: "*/5 * * * *",
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(bothRes.success, false);
	});
});
