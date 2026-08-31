/**
 * contextTools.ts — Agent Tools for Two-Way UI View and Clinical Context Management.
 * Allows Copilot to inspect and control active screen, patient selection, and FDI tooth focus.
 */

import { z } from "zod";
import type { AgentContext } from "../context.js";
import type { ToolDefinition } from "./tool.js";
import type { ToolRegistry } from "./registry.js";

export const UI_VIEWS = [
	"shift",
	"schedule",
	"patients",
	"odontogram",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
	"inventory",
	"scanner",
	"settings",
	"marketing",
] as const;

export const GetActiveContextSchema = z.object({}).strict();

export const getActiveContextTool: ToolDefinition<
	typeof GetActiveContextSchema,
	Record<string, unknown>
> = {
	name: "get_active_context",
	description:
		"Возвращает текущий активный контекст интерфейса CRM (активный экран, ID пациента, выбранный номер зуба FDI, ФИО врача).",
	parameters: GetActiveContextSchema,
	permissions: ["agent.read"],
	category: "read",
	handler: async (ctx: AgentContext) => {
		const uiCtx = (ctx.metadata?.uiContext as Record<string, unknown>) ?? {};
		return {
			view: uiCtx.view ?? "shift",
			viewLabel: uiCtx.viewLabel ?? "Смена",
			patientId: uiCtx.patientId ?? null,
			patientName: uiCtx.patientName ?? null,
			activeTooth: uiCtx.activeTooth ?? null,
			activeDoctor: uiCtx.activeDoctor ?? null,
			organizationId: ctx.organizationId,
			clinicId: ctx.clinicId,
		};
	},
};

export const SwitchViewSchema = z.object({
	view: z.enum(UI_VIEWS).describe("Целевой экран CRM (например, odontogram, schedule, patients, finance, inventory)"),
	patientId: z.string().uuid().optional().describe("Опциональный UUID пациента для открытия карточки"),
	activeTooth: z.union([z.number().int().min(11).max(85), z.string()]).optional().describe("Опциональный номер зуба FDI (11..48, 51..85)"),
}).strict();

export const switchViewTool: ToolDefinition<
	typeof SwitchViewSchema,
	Record<string, unknown>
> = {
	name: "switch_view",
	description:
		"Переключает активный рабочий экран интерфейса CRM (Одонтограмма, Расписание, Пациенты, Финансы, Склад, СанПиН) с опциональным фокусом на пациенте или зубе.",
	parameters: SwitchViewSchema,
	permissions: ["agent.write"],
	category: "write",
	handler: async (_ctx: AgentContext, args) => {
		return {
			action: "SWITCH_VIEW",
			targetView: args.view,
			patientId: args.patientId ?? null,
			activeTooth: args.activeTooth ?? null,
			applied: true,
			message: `Переход на экран ${args.view}${args.activeTooth ? `, зуб #${args.activeTooth}` : ""}`,
		};
	},
};

export const SelectToothSchema = z.object({
	toothFdi: z.number().int().min(11).max(85).describe("Номер зуба по международной формуле FDI (11..48, 51..85)"),
	surface: z.string().optional().describe("Опциональная поверхность зуба (O, M, D, V, L)"),
}).strict();

export const selectToothTool: ToolDefinition<
	typeof SelectToothSchema,
	Record<string, unknown>
> = {
	name: "select_tooth",
	description:
		"Выбирает конкретный зуб по формуле FDI (11-48, 51-85) в одонтограмме активного пациента для последующих клинических действий.",
	parameters: SelectToothSchema,
	permissions: ["agent.write"],
	category: "write",
	handler: async (_ctx: AgentContext, args) => {
		return {
			action: "SELECT_TOOTH",
			toothFdi: args.toothFdi,
			surface: args.surface ?? null,
			applied: true,
			message: `Выбран зуб #${args.toothFdi}${args.surface ? ` (поверхность ${args.surface})` : ""}`,
		};
	},
};

export const SelectPatientSchema = z.object({
	patientId: z.string().uuid().describe("UUID пациента в базе данных CRM"),
}).strict();

export const selectPatientTool: ToolDefinition<
	typeof SelectPatientSchema,
	Record<string, unknown>
> = {
	name: "select_patient",
	description:
		"Устанавливает активного пациента в CRM для просмотра ЭМК, одонтограммы, планов лечения или записи на прием.",
	parameters: SelectPatientSchema,
	permissions: ["agent.write"],
	category: "write",
	handler: async (_ctx: AgentContext, args) => {
		return {
			action: "SELECT_PATIENT",
			patientId: args.patientId,
			applied: true,
			message: `Установлен активный пациент #${args.patientId.slice(0, 8)}`,
		};
	},
};

export function registerContextTools(
	registry: ToolRegistry,
	moduleName?: string,
): void {
	registry.register(getActiveContextTool, moduleName);
	registry.register(switchViewTool, moduleName);
	registry.register(selectToothTool, moduleName);
	registry.register(selectPatientTool, moduleName);
}
