import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import type {
	ClinicalTask,
	ClinicalTaskPreset,
	PhaseOption,
} from "./clinicalTasksTypes";

export const CLINICAL_TASK_PRESETS: readonly ClinicalTaskPreset[] = [
	{
		id: "preset-ortho-call",
		testId: "preset-task-ortho-call",
		label: "Звонок ортодонта / контроль брекетов",
		title: "Звонок ортодонта / контроль брекетов",
		defaultDescription:
			"Контрольный звонок ортодонтического пациента: оценка адаптации, целостности дуг, фиксации брекетов/элайнеров.",
		taskType: "orthodontics_recall",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 21);
			return d.toISOString();
		},
		hint: "1 клик: контроль брекетов/элайнеров через 3 недели",
	},
	{
		id: "preset-implant-check",
		testId: "preset-task-implant-check",
		label: "Контрольный осмотр после имплантации",
		title: "Контрольный осмотр после имплантации",
		defaultDescription:
			"Осмотр зоны имплантации, контроль заживления слизистой, оценка стабильности формирователя десны / винтов.",
		taskType: "implant_check",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 10);
			return d.toISOString();
		},
		hint: "1 клик: контрольный осмотр после имплантации через 10 дней",
	},
	{
		id: "preset-prosthetics-ztl",
		testId: "preset-task-prosthetics-ztl",
		label: "Готовность работы ЗТЛ",
		title: "Готовность работы ЗТЛ",
		defaultDescription:
			"Припасовка ортопедической конструкции из зуботехнической лаборатории (ЗТЛ), проверка окклюзионных контактов.",
		taskType: "prosthetics_fitting",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 7);
			return d.toISOString();
		},
		hint: "1 клик: отследить готовность работы в лаборатории через 7 дней",
	},
	{
		id: "preset-recall-6m",
		testId: "preset-task-recall-6m",
		label: "Напоминание о профгигиене через 6 мес",
		title: "Напоминание о профгигиене через 6 мес",
		defaultDescription:
			"Плановый контрольный осмотр и оценка гигиенического статуса через 6 месяцев. Профгигиена полости рта.",
		taskType: "recall_hygiene",
		computeDueAt: () => {
			const d = new Date();
			d.setMonth(d.getMonth() + 6);
			return d.toISOString();
		},
		hint: "1 клик: создать задачу контрольного осмотра и профгигиены через 6 месяцев",
	},
	{
		id: "preset-ct-planning",
		testId: "preset-task-ct-planning",
		label: "Снимок КТ / планирование",
		title: "Снимок КТ / планирование",
		defaultDescription:
			"Анализ КЛКТ/визиографии, виртуальная расстановка имплантов, разметка нижнечелюстного канала или заказ хирургического шаблона.",
		taskType: "ct_planning",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 3);
			return d.toISOString();
		},
		hint: "1 клик: задача на анализ КТ и 3D-планирование за 3 дня",
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
		hint: "1 клик: создать задачу на снятие швов через 7–10 дней после хирургии",
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
		hint: "1 клик: создать задачу на контрольный снимок визиографа RVG",
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
		hint: "1 клик: подготовить диагностический/рабочий слепок за 24 часа",
	},
	{
		id: "preset-order-implant",
		testId: "preset-task-order-implant",
		label: "Заказать имплант",
		title: "Заказать имплант",
		defaultDescription:
			"Заказ дентального имплантата, формирователя десны и хирургических компонентов под клинический случай.",
		taskType: "order_implant",
		computeDueAt: () => {
			const d = new Date();
			d.setDate(d.getDate() + 3);
			return d.toISOString();
		},
		hint: "1 клик: заказать имплант и хирургические компоненты за 3 дня",
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
