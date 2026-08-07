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
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { showToast } from "./components/GlobalToast";
import { actionFailureToast } from "./lib/panelStateText";

type ClinicalTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

type CustomTaskType = {
	id: string;
	organizationId: string;
	typeCode: string;
	typeLabel: string;
	colorHex: string;
	requiresPatientBinding: boolean;
	defaultSlaHours: number;
	createdAt: string;
};

type ClinicalTask = {
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

function formatMoment(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
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

	const loadFailureText = useCallback((
		status: number,
		serverMessage: string | null,
	): string => {
		if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
		if (status === 401 || status === 403)
			return "Нет прав смотреть клинические задачи: доступ закрыт или истёк вход в программу.";
		if (status === 404) return "Раздел клинических задач не отвечает.";
		if (status >= 500)
			return "Сбой на сервере клиники: список задач не собран.";
		return `Программа не смогла получить список задач (ответ ${status}).`;
	}, []);

	const actionFailureText = useCallback((
		status: number,
		serverMessage: string | null,
	): string => {
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
	}, []);

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
				setTasks(null);
				setCustomTaskTypes(null);
				setError(
					"Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.",
				);
				return;
			}
			const payload = (await response.json().catch((err) => {
				console.error('[Dente]', err);
				showToast(actionFailureToast('Ответ со списком задач не прочитан', (err as { status?: number })?.status ?? null), 'error');
				return null;
			})) as
				| ClinicalTask[]
				| { message?: string }
				| null;
			if (!response.ok) {
				setTasks(null);
				const message =
					payload &&
					!Array.isArray(payload) &&
					typeof payload.message === "string"
						? payload.message
						: null;
				setError(loadFailureText(response.status, message));
				return;
			}
			if (!Array.isArray(payload)) {
				setTasks(null);
				setError("Сервер ответил, но списка задач в ответе нет.");
				return;
			}
			setTasks(payload);

			if (customTypesResponse?.ok) {
				const customData = await customTypesResponse.json().catch((err) => {
					console.error('[Dente]', err);
					showToast(actionFailureToast('Типы задач не прочитаны', (err as { status?: number })?.status ?? null), 'error');
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
				console.error('[Dente]', err);
				showToast(actionFailureToast('Ответ о фиксации этапа не прочитан', (err as { status?: number })?.status ?? null), 'error');
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

	if (!patientId) return null;

	const openTasks = (tasks ?? []).filter((task) =>
		OPEN_STATUSES.has(task.status),
	);
	const closedTasks = (tasks ?? []).filter(
		(task) => !OPEN_STATUSES.has(task.status),
	);

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
					disabled={submittingPhase !== null}
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
							disabled={submittingPhase !== null}
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
							disabled={submittingPhase !== null}
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

			{tasks !== null && openTasks.length === 0 && !error ? (
				<p className="ops-note">
					Открытых задач передачи у этого пациента нет. Когда этап будет
					завершён кнопкой выше — задача появится здесь и у следующего врача.
				</p>
			) : null}

			{openTasks.length > 0 ? (
				<div className="ops-table-wrap">
					<table className="ops-table">
						<caption className="sr-only">
							Открытые задачи передачи между этапами
						</caption>
						<thead>
							<tr>
								<th scope="col">Задача</th>
								<th scope="col">Статус</th>
								<th scope="col">Создана</th>
							</tr>
						</thead>
						<tbody>
							{openTasks.map((task) => (
								<tr key={task.id}>
									<td className="ops-strong" data-label="Задача">
										{task.title}
										{task.description ? (
											<span className="ops-note">{task.description}</span>
										) : null}
									</td>
									<td data-label="Статус">
										<span className="ops-state ops-state--warn">
											{STATUS_LABELS[task.status] ?? task.status}
										</span>
									</td>
									<td data-label="Создана">
										{task.createdAt ? formatMoment(task.createdAt) : "—"}
									</td>
								</tr>
							))}
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
