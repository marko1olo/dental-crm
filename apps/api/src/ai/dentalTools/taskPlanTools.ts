/**
 * @file taskPlanTools.ts
 * @description Инструмент динамического управления планом задач агента (manage_task_plan).
 * Позволяет автономному ассистенту создавать план шагов с зависимостями,
 * отслеживать прогресс, фиксировать результат каждого шага и избегать кругового зацикливания.
 */

import {
	type TaskPlan,
	type TaskPlanItemStatus,
	addTaskPlanItem,
	createTaskPlan,
	formatPlanForSystemPrompt,
	formatPlanSummary,
	getNextActionableItems,
	getPlanProgress,
	isPlanComplete,
	updateTaskPlanItemStatus,
} from "@dental/shared";
import { z } from "zod";
import {
	type DentalToolContext,
	type DentalToolEntry,
	createOpenAIToolDefinition,
} from "./types.js";

// Локальное in-memory хранилище активных планов по сессиям
const activePlansStore = new Map<string, TaskPlan>();

/**
 * Возвращает уникальный ключ контекста для хранения плана сессии
 */
function getContextPlanKey(context: DentalToolContext): string {
	if (context.activeVisitId) return `visit_${context.activeVisitId}`;
	if (context.patientId) return `patient_${context.patientId}`;
	if (context.userId) return `user_${context.userId}`;
	return `org_${context.organizationId || "default"}`;
}

/**
 * Очищает хранилище планов (для изоляции тестов)
 */
export function clearActivePlansStore(): void {
	activePlansStore.clear();
}

/**
 * Схема входных параметров инструмента manage_task_plan
 */
export const manageTaskPlanSchema = z.object({
	action: z
		.enum(["create", "update_status", "add_item", "get_plan"])
		.describe(
			"Действие: 'create' (создать новый план), 'update_status' (обновить статус шага), 'add_item' (добавить шаг в план), 'get_plan' (просмотреть текущий план и доступные шаги)",
		),
	goal: z
		.string()
		.optional()
		.describe("Основная цель плана задач (обязательно при action='create')"),
	items: z
		.array(
			z.object({
				id: z
					.string()
					.describe(
						"Уникальный идентификатор шага (например, 'audit_card', 'setup_chair')",
					),
				title: z
					.string()
					.describe(
						"Понятное наименование действия на русском языке без канцелярита",
					),
				blockedBy: z
					.array(z.string())
					.optional()
					.describe("Идентификаторы шагов, которые должны завершиться до старта этого шага"),
				notes: z
					.string()
					.optional()
					.describe("Клинические или технические пояснения"),
			}),
		)
		.optional()
		.describe("Список шагов при создании нового плана (action='create')"),
	itemId: z
		.string()
		.optional()
		.describe("Идентификатор обновляемого шага (при action='update_status')"),
	status: z
		.enum(["pending", "in_progress", "completed", "failed", "skipped"])
		.optional()
		.describe("Новый статус шага (при action='update_status')"),
	notes: z
		.string()
		.optional()
		.describe("Заметка, результат или причина ошибки по шагу"),
	item: z
		.object({
			id: z.string().describe("Идентификатор добавляемого шага"),
			title: z
				.string()
				.describe("Наименование действия на русском языке без канцелярита"),
			blockedBy: z.array(z.string()).optional(),
			notes: z.string().optional(),
		})
		.optional()
		.describe("Новый шаг для добавления в существующий план (при action='add_item')"),
});

export type ManageTaskPlanInput = z.infer<typeof manageTaskPlanSchema>;

export interface ManageTaskPlanResult {
	success: boolean;
	message: string;
	directive?: string;
	plan?: TaskPlan;
	actionableItems?: Array<{ id: string; title: string }>;
	isComplete?: boolean;
	progress?: {
		total: number;
		completed: number;
		inProgress: number;
		pending: number;
		failed: number;
		skipped: number;
		percent: number;
	};
	formatted?: string;
	summary?: string;
}

/**
 * Обработчик инструмента manage_task_plan
 */
export async function handleManageTaskPlan(
	args: ManageTaskPlanInput,
	context: DentalToolContext,
): Promise<ManageTaskPlanResult> {
	const contextKey = getContextPlanKey(context);

	switch (args.action) {
		case "create": {
			if (!args.goal || args.goal.trim() === "") {
				return {
					success: false,
					message:
						"Ошибка: для создания плана (action='create') необходимо указать цель (goal).",
				};
			}

			if (!args.items || args.items.length === 0) {
				return {
					success: false,
					message:
						"Ошибка: для создания плана необходимо передать хотя бы один шаг в массиве items.",
				};
			}

			try {
				const newPlan = createTaskPlan(args.goal, args.items);
				activePlansStore.set(contextKey, newPlan);

				const actionable = getNextActionableItems(newPlan);
				const progress = getPlanProgress(newPlan);
				const firstActionableTitle = actionable[0]
					? `'${actionable[0].id}' (${actionable[0].title})`
					: "нет";

				return {
					success: true,
					message: `План задач '${newPlan.taskId}' успешно создан. Всего шагов: ${newPlan.items.length}.`,
					directive: `План зарегистрирован. НЕ ВЫЗЫВАЙ manage_task_plan повторно! Немедленно приступай к выполнению первого шага: ${firstActionableTitle}.`,
					plan: newPlan,
					actionableItems: actionable.map((a) => ({
						id: a.id,
						title: a.title,
					})),
					isComplete: isPlanComplete(newPlan),
					progress,
					formatted: formatPlanForSystemPrompt(newPlan),
					summary: formatPlanSummary(newPlan),
				};
			} catch (err: unknown) {
				const errorMessage =
					err instanceof Error ? err.message : String(err);
				return {
					success: false,
					message: `Ошибка валидации плана: ${errorMessage}`,
				};
			}
		}

		case "update_status": {
			const currentPlan = activePlansStore.get(contextKey);
			if (!currentPlan) {
				return {
					success: false,
					message:
						"Ошибка: активный план задач не найден. Сначала вызови action='create'.",
				};
			}

			if (!args.itemId) {
				return {
					success: false,
					message:
						"Ошибка: для обновления шага необходимо указать itemId.",
				};
			}

			if (!args.status) {
				return {
					success: false,
					message:
						"Ошибка: для обновления шага необходимо указать status.",
				};
			}

			try {
				const updatedPlan = updateTaskPlanItemStatus(
					currentPlan,
					args.itemId,
					args.status as TaskPlanItemStatus,
					args.notes,
				);
				activePlansStore.set(contextKey, updatedPlan);

				const complete = isPlanComplete(updatedPlan);
				const actionable = getNextActionableItems(updatedPlan);
				const progress = getPlanProgress(updatedPlan);

				const directive = complete
					? "🎯 Все шаги плана завершены! Переходи к формированию итогового клинического ответа врачу."
					: actionable.length > 0
						? `Шаг '${args.itemId}' обновлен (${args.status}). Следующие доступные шаги: ${actionable.map((a) => `'${a.id}'`).join(", ")}. Выполняй следующий шаг!`
						: "Шаг обновлен. Ожидаются другие действия.";

				return {
					success: true,
					message: `Шаг '${args.itemId}' успешно переведен в статус '${args.status}'.`,
					directive,
					plan: updatedPlan,
					actionableItems: actionable.map((a) => ({
						id: a.id,
						title: a.title,
					})),
					isComplete: complete,
					progress,
					formatted: formatPlanForSystemPrompt(updatedPlan),
					summary: formatPlanSummary(updatedPlan),
				};
			} catch (err: unknown) {
				const errorMessage =
					err instanceof Error ? err.message : String(err);
				return {
					success: false,
					message: `Ошибка обновления статуса шага: ${errorMessage}`,
				};
			}
		}

		case "add_item": {
			const currentPlan = activePlansStore.get(contextKey);
			if (!currentPlan) {
				return {
					success: false,
					message:
						"Ошибка: активный план задач не найден. Сначала вызови action='create'.",
				};
			}

			if (!args.item || !args.item.id || !args.item.title) {
				return {
					success: false,
					message:
						"Ошибка: для добавления шага необходимо передать объект item с id и title.",
				};
			}

			try {
				const updatedPlan = addTaskPlanItem(currentPlan, args.item);
				activePlansStore.set(contextKey, updatedPlan);

				const actionable = getNextActionableItems(updatedPlan);
				const progress = getPlanProgress(updatedPlan);

				return {
					success: true,
					message: `Шаг '${args.item.id}' успешно добавлен в план задач.`,
					directive: `Шаг добавлен. Доступные шаги к выполнению: ${actionable.map((a) => `'${a.id}'`).join(", ")}.`,
					plan: updatedPlan,
					actionableItems: actionable.map((a) => ({
						id: a.id,
						title: a.title,
					})),
					isComplete: isPlanComplete(updatedPlan),
					progress,
					formatted: formatPlanForSystemPrompt(updatedPlan),
					summary: formatPlanSummary(updatedPlan),
				};
			} catch (err: unknown) {
				const errorMessage =
					err instanceof Error ? err.message : String(err);
				return {
					success: false,
					message: `Ошибка добавления шага в план: ${errorMessage}`,
				};
			}
		}

		case "get_plan": {
			const currentPlan = activePlansStore.get(contextKey);
			if (!currentPlan) {
				return {
					success: true,
					message:
						"Активный план задач отсутствует. При выполнении многошаговой задачи создай план через action='create'.",
				};
			}

			const actionable = getNextActionableItems(currentPlan);
			const progress = getPlanProgress(currentPlan);

			return {
				success: true,
				message: `План '${currentPlan.taskId}': ${currentPlan.goal}`,
				plan: currentPlan,
				actionableItems: actionable.map((a) => ({
					id: a.id,
					title: a.title,
				})),
				isComplete: isPlanComplete(currentPlan),
				progress,
				formatted: formatPlanForSystemPrompt(currentPlan),
				summary: formatPlanSummary(currentPlan),
			};
		}

		default: {
			return {
				success: false,
				message: `Неизвестное действие: '${(args as { action: string }).action}'.`,
			};
		}
	}
}

/**
 * Запись инструмента manage_task_plan в реестре инструментов DENTE
 */
export const manageTaskPlanTool: DentalToolEntry<typeof manageTaskPlanSchema> = {
	name: "manage_task_plan",
	description:
		"Управление динамическим планом выполнения сложных задач (создание, обновление статуса шагов, просмотр следующих доступных действий с учетом зависимостей). Предотвращает потерю фокуса и зацикливание.",
	schema: manageTaskPlanSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"manage_task_plan",
		"Создание и ведение динамического плана шагов задачи с контролем зависимостей (action: 'create', 'update_status', 'add_item', 'get_plan').",
		manageTaskPlanSchema,
	),
	destructive: false,
	titleRu: "Управление планом действий",
	handler: handleManageTaskPlan,
};
