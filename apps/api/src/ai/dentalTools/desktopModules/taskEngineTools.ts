/**
 * @file taskEngineTools.ts
 * @description Инструмент manage_task для управления фоновыми задачами врача.
 */

import { z } from "zod";
import {
	createOpenAIToolDefinition,
	type DentalToolContext,
	type DentalToolEntry,
} from "../types.js";
import {
	checkIsLocalWorkstation,
	DESKTOP_DENIED_RESPONSE,
} from "./desktopSecurity.js";
import { workstationTasks } from "./taskManager.js";

export const manageTaskSchema = z.object({
	action: z
		.enum(["list", "status", "kill", "send_input"])
		.describe("Действие с фоновой задачей: list, status, kill, send_input"),
	taskId: z
		.string()
		.optional()
		.describe("Идентификатор задачи (обязателен для status, kill, send_input)"),
	input: z
		.string()
		.optional()
		.describe("Текст для отправки в стандартный ввод (для send_input)"),
});

export type ManageTaskInput = z.infer<typeof manageTaskSchema>;

export async function handleManageTask(
	args: ManageTaskInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	if (args.action === "list") {
		const tasks = workstationTasks.list();
		return {
			success: true,
			totalTasks: tasks.length,
			tasks,
			message: `Активных и недавних фоновых задач: ${tasks.length}`,
		};
	}

	if (!args.taskId) {
		return {
			success: false,
			error: `Для действия '${args.action}' параметр taskId обязателен.`,
		};
	}

	if (args.action === "status") {
		const task = workstationTasks.get(args.taskId);
		if (!task) {
			return { success: false, error: `Задача с taskId '${args.taskId}' не найдена.` };
		}
		return {
			success: true,
			task,
			recentStdout: task.stdout.slice(-50).join("\n"),
			recentStderr: task.stderr.slice(-50).join("\n"),
		};
	}

	if (args.action === "kill") {
		const res = workstationTasks.kill(args.taskId);
		return { success: res.success, taskId: args.taskId, message: res.message };
	}

	if (args.action === "send_input") {
		if (args.input === undefined) {
			return { success: false, error: "Для действия send_input параметр input обязателен." };
		}
		const res = workstationTasks.sendInput(args.taskId, args.input);
		return { success: res.success, taskId: args.taskId, message: res.message };
	}

	return { success: false, error: `Неизвестное действие: ${args.action}` };
}

export const manageTaskTool: DentalToolEntry<typeof manageTaskSchema> = {
	name: "manage_task",
	description:
		"Управление фоновыми процессами и скриптами рабочей станции врача (list, status, kill, send_input) (desktop_native).",
	schema: manageTaskSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"manage_task",
		"Управление и инспекция фоновых задач на ПК врача.",
		manageTaskSchema,
	),
	handler: handleManageTask,
};
