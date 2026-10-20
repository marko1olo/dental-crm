/**
 * @file packages/shared/src/ai/taskPlanTracker.ts
 * @description Динамический трекер плана и многошаговой памяти агентного харнесса DENTE.
 * Реализует структуру задач с графом зависимостей, детекцией циклов, вычислением
 * доступных следующих шагов и компактным форматированием для системного промпта и автокомпактификации.
 * Разработан по стандартам передовых агентных платформ (Claude Code, Cline, OpenHands).
 */

import { z } from "zod";

// ==============================================================================
// 1. ZOD SCHEMAS & TYPES
// ==============================================================================

export const taskPlanItemStatusSchema = z.enum([
	"pending",
	"in_progress",
	"completed",
	"failed",
	"skipped",
]);

export type TaskPlanItemStatus = z.infer<typeof taskPlanItemStatusSchema>;

export const taskPlanItemSchema = z.object({
	id: z.string().min(1, "Идентификатор шага не может быть пустым"),
	title: z.string().min(1, "Название шага не может быть пустым"),
	status: taskPlanItemStatusSchema.default("pending"),
	notes: z.string().optional(),
	blockedBy: z.array(z.string()).default([]),
});

export type TaskPlanItem = z.infer<typeof taskPlanItemSchema>;

export const taskPlanSchema = z.object({
	taskId: z.string().min(1, "Идентификатор плана не может быть пустым"),
	goal: z.string().min(1, "Цель плана не может быть пустой"),
	items: z
		.array(taskPlanItemSchema)
		.min(1, "План обязан содержать как минимум один шаг"),
	createdAt: z.number().int().nonnegative(),
	updatedAt: z.number().int().nonnegative(),
});

export type TaskPlan = z.infer<typeof taskPlanSchema>;

export interface CreateTaskPlanItemInput {
	id: string;
	title: string;
	blockedBy?: string[] | undefined;
	notes?: string | undefined;
	status?: TaskPlanItemStatus | undefined;
}

export interface TaskPlanProgress {
	total: number;
	completed: number;
	inProgress: number;
	pending: number;
	failed: number;
	skipped: number;
	percent: number;
}

// ==============================================================================
// 2. GRAPH VALIDATION & CYCLE DETECTION
// ==============================================================================

/**
 * Выполняет поиск циклов в графе зависимостей задач с помощью DFS.
 * Если найден цикл (например: A -> B -> C -> A), возвращает массив идентификаторов в цикле.
 * В противном случае возвращает null.
 */
export function detectPlanCycles(
	items: Array<{ id: string; blockedBy?: string[] | undefined }>,
): string[] | null {
	const itemMap = new Map<string, string[]>();
	for (const item of items) {
		itemMap.set(item.id, item.blockedBy ? [...item.blockedBy] : []);
	}

	// 0: Unvisited, 1: Visiting (в текущем стеке DFS), 2: Visited (полностью обработан)
	const state = new Map<string, number>();
	const path: string[] = [];

	function dfs(currentId: string): string[] | null {
		state.set(currentId, 1);
		path.push(currentId);

		const dependencies = itemMap.get(currentId) || [];
		for (const depId of dependencies) {
			const depState = state.get(depId) ?? 0;
			if (depState === 1) {
				// Найден цикл! Восстанавливаем цепочку цикла
				const cycleStartIndex = path.indexOf(depId);
				if (cycleStartIndex !== -1) {
					return [...path.slice(cycleStartIndex), depId];
				}
				return [depId, currentId, depId];
			}
			if (depState === 0) {
				const cycleFound = dfs(depId);
				if (cycleFound) return cycleFound;
			}
		}

		path.pop();
		state.set(currentId, 2);
		return null;
	}

	for (const item of items) {
		const currentState = state.get(item.id) ?? 0;
		if (currentState === 0) {
			const cycle = dfs(item.id);
			if (cycle) return cycle;
		}
	}

	return null;
}

/**
 * Валидирует целостность элементов плана:
 * - Отсутствие пустых списков
 * - Уникальность идентификаторов
 * - Существование всех идентификаторов в зависимостях blockedBy
 * - Отсутствие циклических зависимостей
 */
export function validateTaskPlanItems(
	items: Array<{ id: string; title: string; blockedBy?: string[] | undefined }>,
): void {
	if (!items || items.length === 0) {
		throw new Error("План задач обязан содержать как минимум один шаг.");
	}

	const idSet = new Set<string>();
	for (const item of items) {
		if (!item.id || item.id.trim() === "") {
			throw new Error("Идентификатор шага задачи не может быть пустым.");
		}
		if (idSet.has(item.id)) {
			throw new Error(
				`Обнаружен дубликат идентификатора шага в плане: '${item.id}'.`,
			);
		}
		idSet.add(item.id);
	}

	for (const item of items) {
		if (item.blockedBy) {
			for (const depId of item.blockedBy) {
				if (!idSet.has(depId)) {
					throw new Error(
						`Шаг плана '${item.id}' зависит от несуществующего шага '${depId}'.`,
					);
				}
				if (depId === item.id) {
					throw new Error(
						`Обнаружена циклическая зависимость: шаг '${item.id}' зависит сам от себя.`,
					);
				}
			}
		}
	}

	const cycle = detectPlanCycles(items);
	if (cycle) {
		throw new Error(
			`Обнаружена циклическая зависимость в плане задач: ${cycle.join(" -> ")}.`,
		);
	}
}

// ==============================================================================
// 3. CORE FUNCTIONS (PURE IMMUTABLE STATE TRANSITIONS)
// ==============================================================================

/**
 * Генерирует детерминированный или уникальный ID плана
 */
function generateTaskId(): string {
	const now = Date.now();
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	return `plan_${now}_${randomSuffix}`;
}

/**
 * Создает новый валидированный план задач с иммутабельной структурой
 */
export function createTaskPlan(
	goal: string,
	items: CreateTaskPlanItemInput[],
	customTaskId?: string,
): TaskPlan {
	if (!goal || goal.trim() === "") {
		throw new Error("Цель плана задач не может быть пустой.");
	}

	validateTaskPlanItems(items);

	const now = Date.now();
	const normalizedItems: TaskPlanItem[] = items.map((item) => ({
		id: item.id.trim(),
		title: item.title.trim(),
		status: item.status ?? "pending",
		notes: item.notes?.trim() || undefined,
		blockedBy: item.blockedBy ? [...item.blockedBy] : [],
	}));

	const plan: TaskPlan = {
		taskId: customTaskId?.trim() || generateTaskId(),
		goal: goal.trim(),
		items: normalizedItems,
		createdAt: now,
		updatedAt: now,
	};

	return taskPlanSchema.parse(plan);
}

/**
 * Иммутабельно обновляет статус и заметки конкретного шага в плане
 */
export function updateTaskPlanItemStatus(
	plan: TaskPlan,
	itemId: string,
	status: TaskPlanItemStatus,
	notes?: string,
): TaskPlan {
	const validatedStatus = taskPlanItemStatusSchema.parse(status);
	const targetIndex = plan.items.findIndex((item) => item.id === itemId);

	if (targetIndex === -1) {
		throw new Error(
			`Шаг '${itemId}' не найден в плане задач '${plan.taskId}'.`,
		);
	}

	const updatedItems = plan.items.map((item, idx) => {
		if (idx !== targetIndex) return item;
		return {
			...item,
			status: validatedStatus,
			notes: notes !== undefined ? notes.trim() : item.notes,
		};
	});

	const updatedPlan: TaskPlan = {
		...plan,
		items: updatedItems,
		updatedAt: Date.now(),
	};

	return taskPlanSchema.parse(updatedPlan);
}

/**
 * Добавляет новый шаг в существующий план с полной валидацией зависимостей
 */
export function addTaskPlanItem(
	plan: TaskPlan,
	item: CreateTaskPlanItemInput,
): TaskPlan {
	const newCandidateItems = [
		...plan.items,
		{
			id: item.id.trim(),
			title: item.title.trim(),
			status: item.status ?? "pending",
			notes: item.notes?.trim() || undefined,
			blockedBy: item.blockedBy ? [...item.blockedBy] : [],
		},
	];

	validateTaskPlanItems(newCandidateItems);

	const updatedPlan: TaskPlan = {
		...plan,
		items: newCandidateItems,
		updatedAt: Date.now(),
	};

	return taskPlanSchema.parse(updatedPlan);
}

/**
 * Возвращает список шагов, доступных для выполнения прямо сейчас (actionable).
 * Шаг доступен, если:
 * 1. Его статус 'pending' или 'in_progress'.
 * 2. Все шаги, указанные в blockedBy, уже находятся в статусе 'completed' или 'skipped'.
 */
export function getNextActionableItems(plan: TaskPlan): TaskPlanItem[] {
	const itemStatusMap = new Map<string, TaskPlanItemStatus>();
	for (const item of plan.items) {
		itemStatusMap.set(item.id, item.status);
	}

	return plan.items.filter((item) => {
		if (item.status !== "pending" && item.status !== "in_progress") {
			return false;
		}

		if (!item.blockedBy || item.blockedBy.length === 0) {
			return true;
		}

		return item.blockedBy.every((depId) => {
			const depStatus = itemStatusMap.get(depId);
			return depStatus === "completed" || depStatus === "skipped";
		});
	});
}

/**
 * Проверяет, завершен ли весь план задач.
 * План считается завершенным, если содержит хотя бы 1 шаг и КАЖДЫЙ шаг имеет статус 'completed' или 'skipped'.
 */
export function isPlanComplete(plan: TaskPlan): boolean {
	if (!plan.items || plan.items.length === 0) return false;
	return plan.items.every(
		(item) => item.status === "completed" || item.status === "skipped",
	);
}

/**
 * Проверяет, есть ли в плане шаги с ошибкой (failed)
 */
export function hasFailedItems(plan: TaskPlan): boolean {
	return plan.items.some((item) => item.status === "failed");
}

/**
 * Рассчитывает подробную статистику выполнения плана
 */
export function getPlanProgress(plan: TaskPlan): TaskPlanProgress {
	const total = plan.items.length;
	let completed = 0;
	let inProgress = 0;
	let pending = 0;
	let failed = 0;
	let skipped = 0;

	for (const item of plan.items) {
		switch (item.status) {
			case "completed":
				completed++;
				break;
			case "in_progress":
				inProgress++;
				break;
			case "pending":
				pending++;
				break;
			case "failed":
				failed++;
				break;
			case "skipped":
				skipped++;
				break;
		}
	}

	const finalized = completed + skipped;
	const percent = total > 0 ? Math.round((finalized / total) * 100) : 0;

	return {
		total,
		completed,
		inProgress,
		pending,
		failed,
		skipped,
		percent,
	};
}

// ==============================================================================
// 4. FORMATTING & SYSTEM PROMPT INJECTION
// ==============================================================================

const STATUS_ICONS: Record<TaskPlanItemStatus, string> = {
	completed: "[x]",
	in_progress: "[>]",
	pending: "[ ]",
	skipped: "[-]",
	failed: "[!]",
};

const STATUS_NAMES_RU: Record<TaskPlanItemStatus, string> = {
	completed: "выполнен",
	in_progress: "в процессе",
	pending: "ожидает",
	skipped: "пропущен",
	failed: "ошибка",
};

/**
 * Форматирует план задач в компактный Markdown-блок для системного контекста агента.
 * Использует понятный человеческий язык без канцелярита и птичьих аббревиатур.
 */
export function formatPlanForSystemPrompt(plan: TaskPlan): string {
	const progress = getPlanProgress(plan);
	const actionable = getNextActionableItems(plan);
	const complete = isPlanComplete(plan);

	const lines: string[] = [
		`### 📋 ПЛАН ВЫПОЛНЕНИЯ ЗАДАЧИ: "${plan.goal}"`,
		`ID: ${plan.taskId} | Прогресс: ${progress.completed + progress.skipped}/${progress.total} (${progress.percent}%) | Статус: ${complete ? "✅ ЗАВЕРШЁН" : "⏳ В РАБОТЕ"}`,
		"",
		"Шаги плана:",
	];

	let i = 0;
	for (const item of plan.items) {
		if (!item) continue;
		const icon = STATUS_ICONS[item.status] || "[ ]";
		const statusText = STATUS_NAMES_RU[item.status] || item.status;
		const isCurrent = item.status === "in_progress" ? " ⚡ ТЕКУЩИЙ ШАГ" : "";

		let line = `${icon} #${i + 1} [${item.id}]: ${item.title} (${statusText})${isCurrent}`;
		if (item.blockedBy && item.blockedBy.length > 0) {
			line += ` — ожидает шаги: ${item.blockedBy.join(", ")}`;
		}
		lines.push(line);

		if (item.notes) {
			lines.push(`   ↳ Примечание: ${item.notes}`);
		}
		i++;
	}

	lines.push("");
	if (complete) {
		lines.push("🎯 Все шаги успешно финализированы. План выполнен!");
	} else if (actionable.length > 0) {
		const actionableList = actionable
			.map((a) => `'${a.id}' (${a.title})`)
			.join(", ");
		lines.push(`👉 Доступно к выполнению прямо сейчас: ${actionableList}`);
	} else if (hasFailedItems(plan)) {
		lines.push(
			"⚠️ Внимание: в плане есть шаги с ошибкой. Требуется исправление или повторный вызов.",
		);
	} else {
		lines.push("⚠️ Нет доступных шагов из-за взаимных ожиданий.");
	}

	return lines.join("\n");
}

/**
 * Создает ультракомпактное однострочное резюме плана для автокомпактификации контекста
 */
export function formatPlanSummary(plan: TaskPlan): string {
	const progress = getPlanProgress(plan);
	const activeItem = plan.items.find((i) => i.status === "in_progress");
	const activeText = activeItem
		? `Активен: '${activeItem.title}'`
		: "Нет активного шага";
	const actionableCount = getNextActionableItems(plan).length;

	return `[План ${plan.taskId}] Цель: "${plan.goal}" | Прогресс: ${progress.completed + progress.skipped}/${progress.total} (${progress.percent}%) | ${activeText} | Доступно к запуску: ${actionableCount}.`;
}

// ==============================================================================
// 5. FLUENT CLASS TASKPLANTRACKER
// ==============================================================================

/**
 * Класс-обертка для управления жизненным циклом плана задач
 */
export class TaskPlanTracker {
	private currentPlan: TaskPlan;

	constructor(plan: TaskPlan) {
		this.currentPlan = taskPlanSchema.parse(plan);
	}

	/**
	 * Создает новый экземпляр трекера с инициализацией плана
	 */
	public static create(
		goal: string,
		items: CreateTaskPlanItemInput[],
		customTaskId?: string,
	): TaskPlanTracker {
		const plan = createTaskPlan(goal, items, customTaskId);
		return new TaskPlanTracker(plan);
	}

	/**
	 * Восстанавливает трекер из JSON-строки или сырого объекта
	 */
	public static fromJson(data: string | unknown): TaskPlanTracker {
		const raw = typeof data === "string" ? JSON.parse(data) : data;
		const parsed = taskPlanSchema.parse(raw);
		return new TaskPlanTracker(parsed);
	}

	/**
	 * Возвращает текущее иммутабельное состояние плана
	 */
	public getPlan(): TaskPlan {
		return {
			...this.currentPlan,
			items: this.currentPlan.items.map((item) => ({
				...item,
				blockedBy: [...item.blockedBy],
			})),
		};
	}

	/**
	 * Обновляет статус конкретного шага
	 */
	public updateStatus(
		itemId: string,
		status: TaskPlanItemStatus,
		notes?: string,
	): this {
		this.currentPlan = updateTaskPlanItemStatus(
			this.currentPlan,
			itemId,
			status,
			notes,
		);
		return this;
	}

	/**
	 * Добавляет новый шаг в план
	 */
	public addItem(item: CreateTaskPlanItemInput): this {
		this.currentPlan = addTaskPlanItem(this.currentPlan, item);
		return this;
	}

	/**
	 * Возвращает список шагов, готовых к выполнению
	 */
	public getNextActionable(): TaskPlanItem[] {
		return getNextActionableItems(this.currentPlan);
	}

	/**
	 * Проверяет, завершен ли план
	 */
	public isComplete(): boolean {
		return isPlanComplete(this.currentPlan);
	}

	/**
	 * Проверяет наличие сбоев
	 */
	public hasFailures(): boolean {
		return hasFailedItems(this.currentPlan);
	}

	/**
	 * Возвращает статистику выполнения
	 */
	public getProgress(): TaskPlanProgress {
		return getPlanProgress(this.currentPlan);
	}

	/**
	 * Форматирует план для системного промпта
	 */
	public formatForPrompt(): string {
		return formatPlanForSystemPrompt(this.currentPlan);
	}

	/**
	 * Форматирует план для автокомпактификации
	 */
	public formatSummary(): string {
		return formatPlanSummary(this.currentPlan);
	}

	/**
	 * Сериализует план в чистый JSON
	 */
	public toJson(): string {
		return JSON.stringify(this.currentPlan, null, 2);
	}
}
