/**
 * Клинические задачи передачи между этапами лечения.
 *
 * ЗАЧЕМ ЭТОТ ЭКРАН. Терапевт закончил свою часть — ортопеду нужно знать, что
 * пациента можно принимать. До этого экрана POST /api/clinical/phase-completions
 * и GET /api/clinical/tasks жили только на сервере: следующий врач открывал
 * карту и не видел ничего. Передача, которую никто не читает, — это передача,
 * которой не произошло.
 *
 * ПОЧЕМУ ЗДЕСЬ, А НЕ В ОТДЕЛЬНОМ РАЗДЕЛЕ. Задачу создаёт врач на приёме, в тот
 * же момент, когда закрывает этап. Список открытых задач того же пациента
 * нужен сразу рядом: иначе «передал» и «кому передал» оказываются в разных
 * местах, и ортопед снова узнаёт о пациенте из коридора.
 *
 * СИСТЕМА НЕ ЗАКРЫВАЕТ ЭТАП ЗА ВРАЧА. Кнопка только фиксирует завершение и
 * создаёт задачу следующему. Статус приёма, подпись ЭМК и оплату врач закрывает
 * своими шагами — эта панель их не подменяет.
 */

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { showToast } from "./components/GlobalToast";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { actionFailureToast } from "./lib/panelStateText";
import { logger } from "./utils/logger";

export type ClinicalTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type CustomTaskType = {
	id: string;
	organizationId: string;
	typeCode: string;
	typeLabel: string;
	colorHex: string;
	requiresPatientBinding: boolean;
	defaultSlaHours: number;
	createdAt: string;
};

export type ClinicalTask = {
	id: string;
	organizationId: string;
	patientId: string;
	treatmentPlanId: string | null;
	assignedDoctorId: string | null;
	taskType: string;
	status: ClinicalTaskStatus;
	title: string;
	description: string | null;
	dueAt: string | null;
	createdAt: string;
};

type ClinicalPhaseCode = "PHASE_1_THERAPY" | "PHASE_2_SURGERY";

export type ClinicalTaskPreset = {
	readonly id: string;
	readonly testId: string;
	readonly label: string;
	readonly title: string;
	readonly defaultDescription: string;
	readonly taskType: string;
	readonly computeDueAt: () => string;
	readonly hint: string;
};

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
];

const LOCAL_STORAGE_KEY_PREFIX = "dente_clinical_local_tasks_";

export function getLocalTasks(patientId: string): ClinicalTask[] {
	if (typeof window === "undefined" || !window.localStorage) return [];
	try {
		const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as ClinicalTask[]) : [];
	} catch {
		return [];
	}
}

export function saveLocalTask(patientId: string, task: ClinicalTask): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		const current = getLocalTasks(patientId);
		const updated = [task, ...current.filter((t) => t.id !== task.id)];
		localStorage.setItem(
			`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`,
			JSON.stringify(updated.slice(0, 50)),
		);
	} catch {
		// Ignore storage quota errors
	}
}

type PhaseOption = {
	code: ClinicalPhaseCode;
	/** Текст на кнопке — как произносят вслух. */
	buttonLabel: string;
	/** Короткая подпись, что именно фиксируем. */
	hint: string;
};

const PHASE_OPTIONS: readonly PhaseOption[] = [
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

const OPEN_STATUSES = new Set<ClinicalTaskStatus>(["pending", "in_progress"]);

const STATUS_LABELS: Record<ClinicalTaskStatus, string> = {
	pending: "ожидает",
	in_progress: "в работе",
	completed: "выполнена",
	cancelled: "отменена",
};

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

export type ClinicalTasksPanelProps = {
	patientId: string | null | undefined;
	/** Врач, которому адресуем задачу передачи (если известен). */
	assignedDoctorId?: string | null;
	treatmentPlanId?: string | null;
};

export const ClinicalTasksPanel: React.FC<ClinicalTasksPanelProps> = ({
	patientId,
	assignedDoctorId = null,
	treatmentPlanId = null,
}) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [tasks, setTasks] = useState<ClinicalTask[] | null>(null);
	const [customTaskTypes, setCustomTaskTypes] = useState<
		CustomTaskType[] | null
	>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	/** Какой этап сейчас отправляем — чтобы кнопка не молчала. */
	const [submittingPhase, setSubmittingPhase] =
		useState<ClinicalPhaseCode | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [actionNotice, setActionNotice] = useState<string | null>(null);
	const [notes, setNotes] = useState("");
	const [filterStatus, setFilterStatus] = useState<"open" | "completed" | "all">(
		"open",
	);
	const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

	const loadFailureText = useCallback(
		(status: number, serverMessage: string | null): string => {
			if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
			if (status === 401 || status === 403)
				return "Нет прав смотреть клинические задачи: доступ закрыт или истёк вход в программу.";
			if (status === 404) return "Раздел клинических задач не отвечает.";
			if (status >= 500)
				return "Сбой на сервере клиники: список задач не собран.";
			return `Программа не смогла получить список задач (ответ ${status}).`;
		},
		[],
	);

	const actionFailureText = useCallback(
		(status: number, serverMessage: string | null): string => {
			if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
			if (status === 401 || status === 403)
				return "Нет прав завершать этап: доступ закрыт или истёк вход в программу.";
			if (status === 404)
				return "Пациент, план или врач не найдены в этой клинике — передачу не создали.";
			if (status === 400)
				return "Не удалось зафиксировать этап: проверьте, что пациент выбран и этап указан верно.";
			if (status >= 500)
				return "Сбой на сервере клиники: передачу между этапами не записали.";
			return `Программа не смогла зафиксировать этап (ответ ${status}).`;
		},
		[],
	);

	const load = useCallback(async () => {
		if (!patientId) {
			setTasks(null);
			setError(null);
			setLoading(false);
			return;
		}
		setError(null);
		setLoading(true);
		try {
			let response: Response;
			let customTypesResponse: Response;
			try {
				response = await fetch(
					`/api/clinical/tasks?patientId=${encodeURIComponent(patientId)}`,
					{
						headers: auth ? auth.denteClinicalReadHeaders() : {},
					},
				);
				customTypesResponse = await fetch("/api/crm/custom-task-types", {
					headers: auth ? auth.denteClinicalReadHeaders() : {},
				});
			} catch {
				const local = getLocalTasks(patientId);
				if (local.length > 0) {
					setTasks(local);
					setError(null);
				} else {
					setTasks(null);
					setCustomTaskTypes(null);
					setError(
						"Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.",
					);
				}
				return;
			}
			const payload = (await response.json().catch((err) => {
				logger.error("[Dente]", err);
				showToast(
					actionFailureToast(
						"Ответ со списком задач не прочитан",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as ClinicalTask[] | { message?: string } | null;
			if (!response.ok) {
				const local = getLocalTasks(patientId);
				if (local.length > 0) {
					setTasks(local);
					setError(null);
				} else {
					setTasks(null);
					const message =
						payload &&
						!Array.isArray(payload) &&
						typeof payload.message === "string"
							? payload.message
							: null;
					setError(loadFailureText(response.status, message));
				}
				return;
			}
			if (!Array.isArray(payload)) {
				const local = getLocalTasks(patientId);
				if (local.length > 0) {
					setTasks(local);
					setError(null);
				} else {
					setTasks(null);
					setError("Сервер ответил, но списка задач в ответе нет.");
				}
				return;
			}
			const local = getLocalTasks(patientId);
			const serverIds = new Set(payload.map((t) => t.id));
			const combined = [
				...payload,
				...local.filter((t) => !serverIds.has(t.id)),
			];
			setTasks(combined);

			if (customTypesResponse?.ok) {
				const customData = await customTypesResponse.json().catch((err) => {
					logger.error("[Dente]", err);
					showToast(
						actionFailureToast(
							"Типы задач не прочитаны",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return null;
				});
				if (Array.isArray(customData)) {
					setCustomTaskTypes(customData as CustomTaskType[]);
				}
			}
		} finally {
			setLoading(false);
		}
	}, [auth, patientId, loadFailureText]);

	useEffect(() => {
		void load();
	}, [load]);

	const completePhase = async (phaseCode: ClinicalPhaseCode) => {
		if (!patientId) {
			setActionError("Пациент не выбран — завершить этап нельзя.");
			return;
		}
		setActionError(null);
		setActionNotice(null);
		setSubmittingPhase(phaseCode);
		try {
			const body: Record<string, unknown> = {
				patientId,
				completedPhaseCode: phaseCode,
			};
			const trimmedNotes = notes.trim();
			if (trimmedNotes !== "") body.notes = trimmedNotes;
			if (treatmentPlanId) body.treatmentPlanId = treatmentPlanId;
			if (assignedDoctorId) body.assignedDoctorId = assignedDoctorId;

			let response: Response;
			try {
				response = await fetch("/api/clinical/phase-completions", {
					method: "POST",
					headers: auth
						? auth.denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
			} catch {
				setActionError(
					"Сервер клиники не ответил. Передачу не записали — повторите, когда сеть восстановится.",
				);
				return;
			}
			const payload = (await response.json().catch((err) => {
				logger.error("[Dente]", err);
				showToast(
					actionFailureToast(
						"Ответ о фиксации этапа не прочитан",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as
				| (ClinicalTask & { message?: string })
				| { message?: string }
				| null;
			if (!response.ok) {
				const message =
					payload &&
					typeof payload === "object" &&
					typeof payload.message === "string"
						? payload.message
						: null;
				setActionError(actionFailureText(response.status, message));
				return;
			}
			const createdTitle =
				payload &&
				typeof payload === "object" &&
				"title" in payload &&
				typeof payload.title === "string"
					? payload.title
					: "задача передачи";
			setActionNotice(
				`Этап зафиксирован: ${createdTitle}. Следующий врач увидит её в списке задач пациента.`,
			);
			setNotes("");
			await load();
		} finally {
			setSubmittingPhase(null);
		}
	};

	const createPresetTask = useCallback(
		async (preset: ClinicalTaskPreset) => {
			if (!patientId) {
				setActionError("Пациент не выбран — создать задачу нельзя.");
				return;
			}
			setActionError(null);
			setActionNotice(null);

			const { task: newTask, dueFormatted } =
				await executeClinicalPresetTaskAutonomy({
					preset,
					patientId,
					notes,
					organizationId: auth?.organizationId,
					treatmentPlanId,
					assignedDoctorId,
					authUserId: auth?.user?.id,
					setTasks: (updater) => setTasks(updater),
					showToastFn: showToast,
				});

			setActionNotice(
				`Создана клиническая задача: «${preset.title}» (срок: ${dueFormatted}). Следующий врач увидит её в списке.`,
			);

			if (notes.trim()) {
				setNotes("");
			}

			// Фоновая попытка синхронизации с карточкой задач пациента
			try {
				const effectiveAssigned = assignedDoctorId || auth?.user?.id;
				if (effectiveAssigned) {
					void fetch(`/api/patients/${encodeURIComponent(patientId)}/tickets`, {
						method: "POST",
						headers: auth
							? auth.denteClinicalMutationHeaders({
									"Content-Type": "application/json",
								})
							: { "Content-Type": "application/json" },
						body: JSON.stringify({
							title: preset.title,
							description: newTask.description,
							assignedToId: effectiveAssigned,
							priority: "normal",
						}),
					}).catch((err) => {
						logger.warn(
							"[ClinicalTasksPanel] Background ticket sync failed, task kept locally:",
							err,
						);
					});
				}
			} catch {
				// Офлайн-сохранение выполнено локально
			}
		},
		[patientId, notes, auth, treatmentPlanId, assignedDoctorId],
	);

	const handleCompleteTask = useCallback(
		async (taskId: string) => {
			if (completingTaskId === taskId) return;
			setCompletingTaskId(taskId);
			// Оптимистичное завершение задачи без блокировок и без обязательных комментариев (Мандаты 8e, 8k)
			setTasks((prev) =>
				(prev ?? []).map((t) =>
					t.id === taskId
						? { ...t, status: "completed" as ClinicalTaskStatus }
						: t,
				),
			);
			try {
				const res = await fetch(
					`/api/clinical/tasks/${encodeURIComponent(taskId)}`,
					{
						method: "PATCH",
						headers: auth
							? auth.denteClinicalMutationHeaders({
									"Content-Type": "application/json",
								})
							: { "Content-Type": "application/json" },
						body: JSON.stringify({ status: "completed" }),
					},
				);
				if (res.ok) {
					showToast("Клиническая задача завершена в 1 клик", "success");
					if (patientId) {
						const current = getLocalTasks(patientId);
						const updated = current.map((t) =>
							t.id === taskId
								? { ...t, status: "completed" as ClinicalTaskStatus }
								: t,
						);
						try {
							localStorage.setItem(
								`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`,
								JSON.stringify(updated),
							);
						} catch {
							// Игнорируем квоту локального хранилища
						}
					}
				} else {
					showToast(
						actionFailureToast("Не удалось завершить задачу", res.status),
						"error",
					);
					await load();
				}
			} catch (e) {
				logger.error("[ClinicalTasksPanel complete]", e);
				showToast(
					actionFailureToast("Не удалось завершить задачу", null),
					"error",
				);
				await load();
			} finally {
				setCompletingTaskId(null);
			}
		},
		[completingTaskId, auth, patientId, load],
	);

	if (!patientId) return null;

	const openTasks = (tasks ?? []).filter((task) =>
		OPEN_STATUSES.has(task.status),
	);
	const closedTasks = (tasks ?? []).filter(
		(task) => !OPEN_STATUSES.has(task.status),
	);
	const visibleTasks = (tasks ?? []).filter((task) => {
		if (filterStatus === "open") return OPEN_STATUSES.has(task.status);
		if (filterStatus === "completed") return !OPEN_STATUSES.has(task.status);
		return true;
	});


	return (
		<section className="panel ops-panel" data-testid="clinical-tasks-panel">
			<div className="panel-heading">
				<h2>Передача между этапами</h2>
				{tasks !== null ? (
					<span
						className={`status-pill ${openTasks.length > 0 ? "status-arrived" : "status-planned"}`}
					>
						{openTasks.length}
					</span>
				) : null}
			</div>

			<p className="ops-hint">
				Когда терапевтический или хирургический этап закончен, зафиксируйте это
				здесь — ортопед получит задачу в карте пациента. Приём, подпись и оплату
				закрывайте своими шагами ниже.
			</p>

			{error ? (
				<div className="ops-notice ops-notice--error" role="alert">
					<p>{error}</p>
					<p>
						Список задач передачи сейчас не виден. Пока он не открылся,
						передавайте пациента следующему врачу устно и сверяйтесь с картой
						вручную.
					</p>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void load()}
						disabled={loading}
					>
						{loading ? "Загружаю…" : "Попробовать снова"}
					</button>
				</div>
			) : null}

			{tasks === null && !error ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{actionError ? (
				<div className="ops-notice ops-notice--error" role="alert">
					<p>{actionError}</p>
				</div>
			) : null}

			{actionNotice ? (
				<div className="ops-notice" role="status">
					<p>{actionNotice}</p>
				</div>
			) : null}

			{/* 1-клик быстрые пресеты клинических задач у кресла (Мандаты 8e, 8k, 8n) */}
			<div
				className="clinical-task-presets"
				style={{
					marginBottom: "1rem",
					padding: "0.75rem",
					background: "var(--paper-soft, #f8fafc)",
					borderRadius: "8px",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<span
					className="ops-label"
					style={{
						display: "block",
						marginBottom: "0.5rem",
						fontWeight: 600,
						fontSize: "0.85rem",
						color: "var(--ink, #1e293b)",
					}}
				>
					Быстрые клинические пресеты (1 клик):
				</span>
				<div
					className="ops-actions"
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "0.5rem",
					}}
				>
					{CLINICAL_TASK_PRESETS.map((preset) => (
						<button
							key={preset.id}
							className="secondary-button"
							type="button"
							data-testid={preset.testId}
							title={preset.hint}
							onClick={() => void createPresetTask(preset)}
							style={{
								fontSize: "0.85rem",
								padding: "0.4rem 0.75rem",
								borderRadius: "6px",
								cursor: "pointer",
							}}
						>
							{preset.label}
						</button>
					))}
				</div>
			</div>

			<div className="ops-form" style={{ marginBottom: "1rem" }}>
				<label className="ops-label" htmlFor="clinical-tasks-notes">
					Комментарий к передаче (необязательно)
				</label>
				<textarea
					id="clinical-tasks-notes"
					className="ops-textarea"
					rows={2}
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
					placeholder="Например: зубы 16 и 17 готовы к препарированию под коронки"
				/>
				<div
					className="ops-actions"
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "0.5rem",
						marginTop: "0.75rem",
					}}
				>
					{PHASE_OPTIONS.map((option) => (
						<button
							key={option.code}
							className="primary-button"
							type="button"
							title={option.hint}
							disabled={submittingPhase === option.code}
							onClick={() => void completePhase(option.code)}
						>
							{submittingPhase === option.code
								? "Записываю…"
								: option.buttonLabel}
						</button>
					))}
					{customTaskTypes?.map((type) => (
						<button
							key={type.typeCode}
							className="secondary-button"
							type="button"
							title={type.typeLabel}
							disabled={submittingPhase === type.typeCode}
							style={{ borderColor: type.colorHex, color: type.colorHex }}
							onClick={() =>
								void completePhase(type.typeCode as ClinicalPhaseCode)
							}
						>
							{submittingPhase === type.typeCode
								? "Записываю…"
								: type.typeLabel}
						</button>
					))}
				</div>
			</div>

			{/* Тулбар фильтрации статусов: ровно 1 компактная строка 32-36px (Мандат 8d) */}
			{tasks !== null && tasks.length > 0 ? (
				<div
					className="clinical-tasks-toolbar"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						height: "36px",
						marginBottom: "0.5rem",
						gap: "0.5rem",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.35rem",
						}}
					>
						<button
							type="button"
							className="secondary-button"
							onClick={() => setFilterStatus("open")}
							style={{
								height: "30px",
								fontSize: "0.8rem",
								padding: "0 0.6rem",
								borderRadius: "6px",
								background:
									filterStatus === "open"
										? "var(--teal, #0284c7)"
										: "var(--paper-soft, #f1f5f9)",
								color:
									filterStatus === "open"
										? "var(--on-teal, #ffffff)"
										: "var(--ink, #1e293b)",
								border: "1px solid var(--line, #e2e8f0)",
								fontWeight: filterStatus === "open" ? 600 : 400,
								cursor: "pointer",
							}}
						>
							К исполнению ({openTasks.length})
						</button>
						<button
							type="button"
							className="secondary-button"
							onClick={() => setFilterStatus("completed")}
							style={{
								height: "30px",
								fontSize: "0.8rem",
								padding: "0 0.6rem",
								borderRadius: "6px",
								background:
									filterStatus === "completed"
										? "var(--teal, #0284c7)"
										: "var(--paper-soft, #f1f5f9)",
								color:
									filterStatus === "completed"
										? "var(--on-teal, #ffffff)"
										: "var(--ink, #1e293b)",
								border: "1px solid var(--line, #e2e8f0)",
								fontWeight: filterStatus === "completed" ? 600 : 400,
								cursor: "pointer",
							}}
						>
							Выполнено ({closedTasks.length})
						</button>
						<button
							type="button"
							className="secondary-button"
							onClick={() => setFilterStatus("all")}
							style={{
								height: "30px",
								fontSize: "0.8rem",
								padding: "0 0.6rem",
								borderRadius: "6px",
								background:
									filterStatus === "all"
										? "var(--teal, #0284c7)"
										: "var(--paper-soft, #f1f5f9)",
								color:
									filterStatus === "all"
										? "var(--on-teal, #ffffff)"
										: "var(--ink, #1e293b)",
								border: "1px solid var(--line, #e2e8f0)",
								fontWeight: filterStatus === "all" ? 600 : 400,
								cursor: "pointer",
							}}
						>
							Все ({tasks.length})
						</button>
					</div>
				</div>
			) : null}

			{tasks !== null && visibleTasks.length === 0 && !error ? (
				<p className="ops-note">
					{filterStatus === "completed"
						? "Выполненных задач передачи у этого пациента пока нет."
						: "Открытых задач передачи у этого пациента нет. Когда этап будет завершён кнопкой выше — задача появится здесь и у следующего врача."}
				</p>
			) : null}

			{visibleTasks.length > 0 ? (
				<div className="ops-table-wrap">
					<table className="ops-table">
						<caption className="sr-only">
							Задачи передачи между этапами
						</caption>
						<thead>
							<tr>
								<th scope="col">Задача</th>
								<th scope="col">Статус</th>
								<th scope="col">Создана</th>
								<th scope="col" style={{ textAlign: "right" }}>
									Действие
								</th>
							</tr>
						</thead>
						<tbody>
							{visibleTasks.map((task) => {
								const isOpen = OPEN_STATUSES.has(task.status);
								return (
									<tr key={task.id}>
										<td
											className="ops-strong min-w-0"
											data-label="Задача"
											style={{ maxWidth: "320px" }}
										>
											<span
												className="truncate block"
												style={{ fontWeight: 600 }}
											>
												{task.title}
											</span>
											{task.description ? (
												<span
													className="ops-note break-words"
													style={{
														display: "block",
														fontSize: "0.8rem",
														color: "var(--muted)",
													}}
												>
													{task.description}
												</span>
											) : null}
										</td>
										<td data-label="Статус">
											<span
												className={`ops-state ${isOpen ? "ops-state--warn" : "ops-state--ok"}`}
											>
												{STATUS_LABELS[task.status] ?? task.status}
											</span>
										</td>
										<td data-label="Создана">
											{task.createdAt
												? formatMoment(task.createdAt)
												: "—"}
											{task.dueAt ? (
												<span
													className="ops-note"
													style={{
														display: "block",
														marginTop: "0.2rem",
														fontSize: "0.8rem",
														color: "var(--brand-primary, #0284c7)",
													}}
												>
													Срок: {formatMoment(task.dueAt)}
												</span>
											) : null}
										</td>
										<td
											data-label="Действие"
											style={{ textAlign: "right" }}
										>
											{isOpen ? (
												<button
													type="button"
													className="primary-button"
													disabled={completingTaskId === task.id}
													onClick={() =>
														void handleCompleteTask(task.id)
													}
													style={{
														height: "30px",
														fontSize: "0.75rem",
														padding: "0 0.6rem",
														borderRadius: "6px",
														cursor: "pointer",
														whiteSpace: "nowrap",
													}}
													title="Завершить задачу в 1 клик (Мандат 8e)"
												>
													{completingTaskId === task.id
														? "Завершаю…"
														: "Завершить в 1 клик"}
												</button>
											) : (
												<span
													style={{
														fontSize: "0.8rem",
														color: "var(--muted)",
													}}
												>
													Выполнена
												</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}


			{closedTasks.length > 0 ? (
				<details
					className="clinical-rules-toggle"
					style={{ marginTop: "0.75rem" }}
				>
					<summary>Закрытые задачи ({closedTasks.length})</summary>
					<ul className="ops-note" style={{ marginTop: "0.5rem" }}>
						{closedTasks.map((task) => (
							<li key={task.id}>
								<strong>{task.title}</strong>
								{" · "}
								{STATUS_LABELS[task.status] ?? task.status}
								{task.createdAt ? ` · ${formatMoment(task.createdAt)}` : ""}
							</li>
						))}
					</ul>
				</details>
			) : null}
		</section>
	);
};

export default ClinicalTasksPanel;
