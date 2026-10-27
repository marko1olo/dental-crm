/**
 * @file scheduleEngineTools.ts
 * @description Инструмент schedule для установки фоновых таймеров и периодических напоминаний.
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
import { workstationSchedules } from "./scheduleManager.js";

export const scheduleSchema = z.object({
	prompt: z
		.string()
		.min(1, "Текст напоминания обязателен")
		.describe("Инструкция/сообщение ассистента при срабатывании"),
	durationSeconds: z
		.number()
		.int()
		.min(1)
		.max(86400)
		.optional()
		.describe("Длительность однократного таймера в секундах"),
	cronExpression: z
		.string()
		.optional()
		.describe("Стандартное 5-позиционное cron-выражение"),
	timerCondition: z
		.string()
		.default("never")
		.describe("Условие ранней отмены ('never', 'any', или ID задачи taskId)"),
	maxIterations: z
		.number()
		.int()
		.min(1)
		.max(1000)
		.optional()
		.describe("Максимальное количество срабатываний cron"),
	isDaemon: z.boolean().default(false).describe("Фоновый постоянный таймер"),
});

export type ScheduleInput = z.input<typeof scheduleSchema>;

export async function handleSchedule(
	args: ScheduleInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	if (!args.durationSeconds && !args.cronExpression) {
		return {
			success: false,
			error:
				"Необходимо указать ровно один параметр: durationSeconds (однократный таймер) или cronExpression (периодический).",
		};
	}

	if (args.durationSeconds && args.cronExpression) {
		return {
			success: false,
			error:
				"Параметры durationSeconds и cronExpression взаимоисключающие. Укажите только один.",
		};
	}

	if (args.durationSeconds) {
		const entry = workstationSchedules.createOneShot(
			args.prompt,
			args.durationSeconds,
			args.timerCondition,
			args.isDaemon,
		);
		return {
			success: true,
			scheduleId: entry.scheduleId,
			mode: "one_shot",
			durationSeconds: args.durationSeconds,
			firesAtIso: entry.firesAtIso,
			timerCondition: args.timerCondition,
			message: `Однократный таймер установлен на ${args.durationSeconds} сек. Сработает в ${entry.firesAtIso}.`,
		};
	}

	if (args.cronExpression) {
		const entry = workstationSchedules.createCron(
			args.prompt,
			args.cronExpression,
			args.maxIterations,
			args.isDaemon,
		);
		return {
			success: true,
			scheduleId: entry.scheduleId,
			mode: "cron",
			cronExpression: args.cronExpression,
			firesAtIso: entry.firesAtIso,
			message: `Периодическое cron-расписание '${args.cronExpression}' успешно активировано.`,
		};
	}

	return { success: false, error: "Ошибка планирования таймера." };
}

export const scheduleTool: DentalToolEntry<typeof scheduleSchema> = {
	name: "schedule",
	description:
		"Планировщик фоновых таймеров и периодических регламентных проверок для ассистента врача на ПК (desktop_native).",
	schema: scheduleSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"schedule",
		"Установка таймеров и периодических напоминаний для ассистента.",
		scheduleSchema,
	),
	handler: handleSchedule,
};
