import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import type {
	ClinicalTask,
	ClinicalTaskPreset,
	PhaseOption,
	TaskDeadlineCategory,
	TaskDeadlineFilter,
} from "./clinicalTasksTypes";

export const CLINICAL_TASK_PRESETS: readonly ClinicalTaskPreset[] = [
	{
		id: "preset-postop-call",
		testId: "preset-task-postop-call",
		label: "Контрольный звонок после удаления",
		title: "Контрольный звонок после сложного удаления/анестезии",
		defaultDescription:
			"Контрольный звонок пациенту: оценка гемостаза, отека, купирования боли, общего самочувствия после сложного удаления/анестезии.",
		taskType: "postop_call",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 1);
			return d.toISOString();
		},
		hint: "Контрольный звонок на следующий день после сложного удаления или анестезии",
	},
	{
		id: "preset-order-implant",
		testId: "preset-task-order-implant",
		label: "Заказать имплантат / костный материал",
		title: "Заказать имплантат / костный материал",
		defaultDescription:
			"Заказ дентального имплантата, формирователя десны, мембраны и остеопластического материала под клинический случай.",
		taskType: "order_implant",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 3);
			return d.toISOString();
		},
		hint: "Заказать имплантат и костный материал за 3 дня",
	},
	{
		id: "preset-prosthetics-ztl",
		testId: "preset-task-prosthetics-ztl",
		label: "Забрать работу из лаборатории",
		title: "Забрать работу из зуботехнической лаборатории (ЗТЛ)",
		defaultDescription:
			"Припасовка ортопедической конструкции из зуботехнической лаборатории (ЗТЛ), проверка окклюзионных контактов.",
		taskType: "prosthetics_fitting",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 7);
			return d.toISOString();
		},
		hint: "Отследить готовность работы в лаборатории через 7 дней",
	},
	{
		id: "preset-recall-6m",
		testId: "preset-task-recall-6m",
		label: "Пригласить на профгигиену (6 мес)",
		title: "Пригласить на профгигиену (6 месяцев) — Профгигиена",
		defaultDescription:
			"Плановый контрольный осмотр и оценка гигиенического статуса через 6 месяцев. Профгигиена полости рта.",
		taskType: "recall_hygiene",
		computeDueAt: () => {
			const d = new Date();
			d.setMonth(d.getMonth() + 6);
			return d.toISOString();
		},
		hint: "Создать задачу контрольного осмотра и профгигиены через 6 месяцев",
	},
	{
		id: "preset-ct-planning",
		testId: "preset-task-ct-planning",
		label: "Проверить готовность КТ/ОПТГ",
		title: "Снимок КТ / планирование",
		defaultDescription:
			"Анализ КЛКТ/ОПТГ/визиографии, виртуальная расстановка имплантов, разметка нижнечелюстного канала или заказ хирургического шаблона.",
		taskType: "ct_planning",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 3);
			return d.toISOString();
		},
		hint: "Проверить готовность снимка КТ/ОПТГ и 3D-планирование за 3 дня",
	},
	{
		id: "preset-suture-removal",
		testId: "preset-task-suture-removal",
		label: "Снятие швов через 7-10 дней",
		title: "Снятие швов через 7-10 дней",
		defaultDescription:
			"Осмотр зоны хирургического вмешательства, контроль эпителизации и снятие швов (7-10 день).",
		taskType: "suture_removal",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 8);
			return d.toISOString();
		},
		hint: "Создать задачу на снятие швов через 7–10 дней после хирургии",
	},
	{
		id: "preset-rvg-control",
		testId: "preset-task-rvg-control",
		label: "Контрольная рентгенография RVG",
		title: "Контрольная рентгенография RVG",
		defaultDescription:
			"Прицельный контрольный радиовизиографический снимок (RVG) для оценки периапикальных тканей/остеоинтеграции.",
		taskType: "rvg_control",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 14);
			return d.toISOString();
		},
		hint: "Создать задачу на контрольный снимок визиографа RVG",
	},
	{
		id: "preset-ortho-call",
		testId: "preset-task-ortho-call",
		label: "Звонок ортодонта / брекеты",
		title: "Звонок ортодонта / контроль брекетов",
		defaultDescription:
			"Контрольный звонок ортодонтического пациента: оценка адаптации, целостности дуг, фиксации брекетов/элайнеров.",
		taskType: "orthodontics_recall",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 21);
			return d.toISOString();
		},
		hint: "Контроль брекетов/элайнеров через 3 недели",
	},
	{
		id: "preset-implant-check",
		testId: "preset-task-implant-check",
		label: "Осмотр после имплантации",
		title: "Контрольный осмотр после имплантации",
		defaultDescription:
			"Осмотр зоны имплантации, контроль заживления слизистой, оценка стабильности формирователя десны / винтов.",
		taskType: "implant_check",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 10);
			return d.toISOString();
		},
		hint: "Контрольный осмотр после имплантации через 10 дней",
	},
	{
		id: "preset-prepare-cast",
		testId: "preset-task-prepare-cast",
		label: "Подготовить слепок",
		title: "Подготовить слепок",
		defaultDescription:
			"Отливка и подготовка гипсовой диагностической/рабочей модели по полученному оттиску/слепку.",
		taskType: "cast_preparation",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 1);
			return d.toISOString();
		},
		hint: "Подготовить диагностический/рабочий слепок за 24 часа",
	},
];

const LOCAL_STORAGE_KEY_PREFIX = "dente_clinical_local_tasks_";

export function getLocalTasks(patientId: string): ClinicalTask[] {
	try {
		const raw = safeLocalStorageGetItem(`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as ClinicalTask[]) : [];
	} catch {
		return [];
	}
}

export function saveLocalTask(patientId: string, task: ClinicalTask): void {
	try {
		const current = getLocalTasks(patientId);
		const updated = [task, ...current.filter((t) => t.id !== task.id)];
		safeLocalStorageSetItem(
			`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`,
			JSON.stringify(updated.slice(0, 50)),
		);
	} catch {
		// Ignore storage quota errors
	}
}

export function updateLocalTaskStatus(
	patientId: string,
	taskId: string,
	status: ClinicalTask["status"],
): void {
	try {
		const current = getLocalTasks(patientId);
		const updated = current.map((t) =>
			t.id === taskId ? { ...t, status } : t,
		);
		safeLocalStorageSetItem(
			`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`,
			JSON.stringify(updated),
		);
	} catch {
		// Ignore storage quota errors
	}
}


export const PHASE_OPTIONS: readonly PhaseOption[] = [
	{
		code: "PHASE_1_THERAPY",
		buttonLabel: "Завершить терапию — передать на ортопедию",
		hint: "Создаст задачу «Этап II: передача в ортопедию».",
	},
	{
		code: "PHASE_2_SURGERY",
		buttonLabel: "Завершить хирургию — передать на ортопедию",
		hint: "Создаст задачу «Этап II: передача в ортопедию после хирургии».",
	},
];

export function formatMoment(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export async function executeClinicalPresetTaskAutonomy(params: {
	preset: ClinicalTaskPreset;
	patientId: string;
	notes?: string;
	organizationId?: string;
	treatmentPlanId?: string | null;
	assignedDoctorId?: string | null;
	authUserId?: string | null;
	saveLocally?: boolean;
	setTasks?: (updater: (prev: ClinicalTask[] | null) => ClinicalTask[]) => void;
	showToastFn?: (
		msg: string,
		type: "info" | "success" | "warning" | "error",
	) => void;
}): Promise<{ task: ClinicalTask; dueFormatted: string }> {
	const dueAt = params.preset.computeDueAt();
	const trimmedNotes = (params.notes ?? "").trim();
	const finalDescription = trimmedNotes
		? `${params.preset.defaultDescription} Комментарий врача: ${trimmedNotes}`
		: params.preset.defaultDescription;

	const newTask: ClinicalTask = {
		id:
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `clinical-task-${Date.now()}-${(Date.now() % 100000).toString(36)}`,
		organizationId: params.organizationId ?? "current-org",
		patientId: params.patientId,
		treatmentPlanId: params.treatmentPlanId ?? null,
		assignedDoctorId: params.assignedDoctorId ?? null,
		taskType: params.preset.taskType,
		status: "pending",
		title: params.preset.title,
		description: finalDescription,
		dueAt,
		createdAt: new Date().toISOString(),
	};

	if (params.saveLocally !== false) {
		saveLocalTask(params.patientId, newTask);
	}

	if (params.setTasks) {
		params.setTasks((prev) => [
			newTask,
			...(prev ?? []).filter((t) => t.id !== newTask.id),
		]);
	}

	const formattedDue = formatMoment(dueAt);
	if (params.showToastFn) {
		params.showToastFn(
			`Клиническая задача создана: ${params.preset.title} (срок: ${formattedDue})`,
			"success",
		);
	}

	return { task: newTask, dueFormatted: formattedDue };
}

export function getTaskDeadlineCategory(dueAt: string | null | undefined): TaskDeadlineCategory {
	if (!dueAt) return "no_due";
	const due = new Date(dueAt);
	if (Number.isNaN(due.getTime())) return "no_due";

	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
	const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
	const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

	if (due.getTime() < todayStart.getTime()) {
		return "overdue";
	}
	if (due.getTime() <= todayEnd.getTime()) {
		return "today";
	}
	if (due.getTime() <= tomorrowEnd.getTime()) {
		return "tomorrow";
	}
	return "upcoming";
}

export function getDeadlineBadge(dueAt: string | null | undefined): {
	label: string;
	tone: "danger" | "warning" | "info" | "neutral";
	isOverdue: boolean;
} {
	if (!dueAt) {
		return { label: "Без срока", tone: "neutral", isOverdue: false };
	}
	const category = getTaskDeadlineCategory(dueAt);
	const formatted = formatMoment(dueAt);

	if (category === "overdue") {
		return {
			label: `Просрочено (${formatted})`,
			tone: "danger",
			isOverdue: true,
		};
	}
	if (category === "today") {
		return {
			label: `Сегодня (${formatted})`,
			tone: "warning",
			isOverdue: false,
		};
	}
	if (category === "tomorrow") {
		return {
			label: `Завтра (${formatted})`,
			tone: "info",
			isOverdue: false,
		};
	}
	return {
		label: `Срок: ${formatted}`,
		tone: "neutral",
		isOverdue: false,
	};
}

export function filterTasksByDeadline(
	tasks: readonly ClinicalTask[],
	filter: TaskDeadlineFilter,
): ClinicalTask[] {
	if (filter === "all") return [...tasks];
	return tasks.filter((t) => {
		const cat = getTaskDeadlineCategory(t.dueAt);
		if (filter === "today") return cat === "today";
		if (filter === "tomorrow") return cat === "tomorrow";
		if (filter === "overdue") return cat === "overdue";
		return true;
	});
}

export function countTasksByDeadline(
	tasks: readonly ClinicalTask[],
): Record<TaskDeadlineFilter, number> {
	let today = 0;
	let tomorrow = 0;
	let overdue = 0;
	for (const t of tasks) {
		if (t.status === "completed" || t.status === "cancelled") continue;
		const cat = getTaskDeadlineCategory(t.dueAt);
		if (cat === "today") today++;
		else if (cat === "tomorrow") tomorrow++;
		else if (cat === "overdue") overdue++;
	}
	return {
		all: tasks.length,
		today,
		tomorrow,
		overdue,
	};
}
