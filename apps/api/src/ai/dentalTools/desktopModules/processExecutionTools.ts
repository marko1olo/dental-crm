/**
 * @file processExecutionTools.ts
 * @description Запуск системных команд оборудования с поддержкой фона и 2-фазным Guard (Мандат 8e).
 */

import { spawn } from "node:child_process";
import { z } from "zod";
import {
	createOpenAIToolDefinition,
	type DentalToolContext,
	type DentalToolEntry,
} from "../types.js";
import {
	checkIsLocalWorkstation,
	DESKTOP_DENIED_RESPONSE,
	isCommandSafe,
} from "./desktopSecurity.js";
import {
	executeCommandWithTimeout,
	resolveDiagnosticCommand,
} from "./processExecutionHelper.js";
import { workstationTasks } from "./taskManager.js";

export const runWorkstationCommandSchema = z.object({
	commandLine: z.string().optional().describe("Системная команда для выполнения"),
	diagnosticTarget: z
		.enum([
			"com_ports",
			"kkt_service_status",
			"xray_device_status",
			"ping_printer",
			"twain_devices",
			"custom",
		])
		.default("custom")
		.describe("Цель диагностики оборудования клиники"),
	targetHostOrPort: z.string().optional().describe("IP-адрес или имя порта"),
	cwd: z.string().optional().describe("Рабочая директория команды"),
	waitMsBeforeAsync: z
		.number()
		.int()
		.min(100)
		.max(30000)
		.default(5000)
		.describe("Время ожидания синхронного выполнения до отправки в фон (мс)"),
	isDaemon: z.boolean().default(false).describe("Запуск в качестве фонового демона"),
});

export type RunWorkstationCommandInput = z.input<typeof runWorkstationCommandSchema>;

export async function handleRunWorkstationCommand(
	args: RunWorkstationCommandInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	const command = resolveDiagnosticCommand(args);
	if (!command) {
		return { success: false, error: "Команда не указана или неверный хост." };
	}
	if (!isCommandSafe(command)) {
		return {
			success: false,
			error: "Отказ безопасности: команда содержит потенциально деструктивные конструкции и заблокирована (Red Team Guard).",
		};
	}
	const workingDir = args.cwd || process.cwd();
	if (args.isDaemon) {
		const child = spawn(command, { shell: true, cwd: workingDir });
		const task = workstationTasks.register(command, workingDir, child, true);
		return {
			success: true,
			status: "background",
			taskId: task.taskId,
			pid: task.pid,
			message: `Фоновый сервис (демон) запущен с taskId: '${task.taskId}'. Отслеживайте через manage_task.`,
		};
	}

	return await executeCommandWithTimeout(command, workingDir, args.waitMsBeforeAsync);
}

export const runWorkstationCommandTool: DentalToolEntry<typeof runWorkstationCommandSchema> = {
	name: "run_workstation_command",
	description:
		"Запуск контролируемых системных и диагностических команд оборудования на ПК врача (COM-порты, ККТ, визиограф) с поддержкой WaitMsBeforeAsync и перехода в фон (desktop_native).",
	schema: runWorkstationCommandSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"run_workstation_command",
		"Запуск команд оборудования и служебных скриптов на ПК врача с поддержкой фона.",
		runWorkstationCommandSchema,
	),
	handler: handleRunWorkstationCommand,
};
