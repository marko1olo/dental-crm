import type {
	CommunicationTaskOutcome,
	Dashboard,
	GeneratedDocument,
	StaffRole,
} from "@dental/shared";
import {
	CheckCircle2,
	FileText,
	History,
	MessageSquare,
	Send,
} from "lucide-react";
import { useState } from "react";
import { CampaignPanel } from "./components/communications/CampaignPanel";
import {
	journalDirectionLabel,
	journalEntryNotice,
	summarizeJournal,
} from "./components/communications/journalDigest";
import { MessageDeliveryConsole } from "./components/communications/MessageDeliveryConsole";
import { EmptyState } from "./components/EmptyState";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { hasCapability } from "./lib/clinicCapabilities";
import { denteAdminSecretRequestHeaders } from "./lib/denteRequestHeaders";
import { countLabel } from "./lib/russianPlural";
import { useSettingsStore } from "./store/settingsStore";

type CommunicationTask = Dashboard["communicationTasks"][number];
type CommunicationTemplate = Dashboard["communicationTemplates"][number];
type CommunicationEvent = Dashboard["communicationEvents"][number];

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type CommunicationsViewProps = {
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	communicationDocumentTaskActionLabels: Partial<
		Record<GeneratedDocument["kind"], string>
	>;
	communicationIntentLabels: Record<CommunicationTask["intent"], string>;
	communicationNote: string;
	communicationPriorityLabels: Record<CommunicationTask["priority"], string>;
	communicationSavingTaskId: string | null;
	communicationStatusLabels: Record<CommunicationTask["status"], string>;
	completeCommunicationTask: (
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => void | Promise<void>;
	dashboard: Dashboard;
	documentKindsForCommunicationTask: (
		task: CommunicationTask,
	) => readonly GeneratedDocument["kind"][];
	documentLabels: Record<GeneratedDocument["kind"], string>;
	formatDateTime: (value: string) => string;
	onCommunicationNoteChange: (value: string) => void;
	onGoToSchedule: () => void;
	openCommunicationTaskDocumentWorkflow: (
		task: CommunicationTask,
		kind: GeneratedDocument["kind"],
	) => void;
	sortedCommunicationTasks: CommunicationTask[];
	staffRoleLabels: Record<StaffRole, string>;
};

/*
  ЗДЕСЬ БЫЛА СВОЯ ФУНКЦИЯ СОГЛАСОВАНИЯ ЧИСЛА `ruCount`. Правило склонения в
  проекте одно, и владелец у него один — countLabel из lib/russianPlural.ts,
  который реэкспортирует AppHelpers. Вторая копия того же правила даёт два
  разных ответа на один вопрос через полгода, поэтому копия убрана, а вызовы
  переведены на общую функцию (порядок форм тот же: одна, две, пять).
*/

const communicationTaskOutcomeLabels: Record<CommunicationTaskOutcome, string> =
	{
		no_answer: "Нет ответа",
		callback_requested: "Перезвонить",
		reschedule_requested: "Перенос записи",
		promised_payment: "Обещал оплату",
		document_pickup: "Заберет документы",
	};

const communicationTaskOutcomeOptions = Object.entries(
	communicationTaskOutcomeLabels,
) as [CommunicationTaskOutcome, string][];

function CommunicationTaskCard({
	communicationChannelLabels,
	communicationDocumentTaskActionLabels,
	communicationIntentLabels,
	communicationPriorityLabels,
	communicationSavingTaskId,
	communicationStatusLabels,
	completionNoteDescriptionId,
	completeCommunicationTask,
	documentKinds,
	documentLabels,
	formatDateTime,
	openCommunicationTaskDocumentWorkflow,
	staffRoleLabels,
	task,
	appointments,
}: {
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	communicationDocumentTaskActionLabels: Partial<
		Record<GeneratedDocument["kind"], string>
	>;
	communicationIntentLabels: Record<CommunicationTask["intent"], string>;
	communicationPriorityLabels: Record<CommunicationTask["priority"], string>;
	communicationSavingTaskId: string | null;
	communicationStatusLabels: Record<CommunicationTask["status"], string>;
	completionNoteDescriptionId: string;
	completeCommunicationTask: (
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => void | Promise<void>;
	documentKinds: readonly GeneratedDocument["kind"][];
	documentLabels: Record<GeneratedDocument["kind"], string>;
	formatDateTime: (value: string) => string;
	openCommunicationTaskDocumentWorkflow: (
		task: CommunicationTask,
		kind: GeneratedDocument["kind"],
	) => void;
	staffRoleLabels: Record<StaffRole, string>;
	task: CommunicationTask;
	appointments: Dashboard["appointments"];
}) {
	const [selectedOutcome, setSelectedOutcome] = useState<
		CommunicationTaskOutcome | ""
	>("");
	const [apptActionLoading, setApptActionLoading] = useState(false);
	const [apptActionDone, setApptActionDone] = useState<
		"confirmed" | "cancelled" | null
	>(null);
	const [apptActionError, setApptActionError] = useState<string | null>(null);
	const isTaskSaving = communicationSavingTaskId === task.id;
	const communicationSaveInProgress = communicationSavingTaskId !== null;
	const outcomeSelectId = `communication-task-outcome-${task.id}`;
	const savingStatusId = `communication-task-saving-${task.id}`;

	const linkedAppointment =
		task.intent === "appointment_confirmation" && task.appointmentId
			? (appointments.find((a) => a.id === task.appointmentId) ?? null)
			: null;

	/*
	 * Секрет расписания берётся из хранилища настроек напрямую.
	 *
	 * ЗАЧЕМ. Маршрут PATCH /api/appointments/:id закрыт охраной
	 * requireScheduleMutationContext (routes/schedule.ts:665 → :573). Она читает
	 * заголовок x-dente-admin-secret, и глобальная обёртка fetch его НЕ
	 * подставляет — этот заголовок клиент обязан слать сам. Без него настоящая
	 * клиника отвечает 403, и кнопки «Подтвердить приём» и «Отменить приём»
	 * мертвы. Локально дефект невидим: в .env этой машины секрет закомментирован,
	 * а лазейки DENTE_CLINICAL_ALLOW_UNGUARDED_* включены и гасят охрану целиком.
	 * Лазейки живут только пока NODE_ENV !== "production", то есть у заказчика их
	 * нет. Найдено гейтом check:guarded-headers 2026-08-09.
	 *
	 * ПОЧЕМУ ИЗ ХРАНИЛИЩА, А НЕ ЧЕРЕЗ auth.scheduleMutationHeaders(). Канонический
	 * помощник живёт в useAuthLogic и читает ТО ЖЕ САМОЕ поле того же хранилища
	 * (useAuthLogic.ts:48,174). Дотянуть его сюда значит протащить пропс через
	 * useAppLogic и App.tsx; источник данных при этом не изменится ни на байт.
	 */
	const scheduleAdminSecretSession = useSettingsStore(
		(state) => state.scheduleAdminSecretSession,
	);

	async function handleConfirmAppointment(status: "confirmed" | "cancelled") {
		if (!task.appointmentId) return;
		setApptActionLoading(true);
		setApptActionError(null);
		try {
			const res = await fetch(`/api/appointments/${task.appointmentId}`, {
				method: "PATCH",
				credentials: "include",
				headers: denteAdminSecretRequestHeaders(
					{ "Content-Type": "application/json" },
					scheduleAdminSecretSession,
				),
				body: JSON.stringify({ status }),
			});
			if (!res.ok) {
				/*
				 * 403 здесь означает не «сеть подвела», а «нет секрета расписания».
				 * Общая надпись про ошибку обновления отправляла администратора
				 * искать неисправность не там.
				 */
				setApptActionError(
					res.status === 403
						? "Нет доступа к изменению расписания: введите секрет расписания в настройках"
						: `Ошибка обновления приёма (${res.status})`,
				);
			} else {
				setApptActionDone(status);
			}
		} catch {
			setApptActionError("Ошибка сети при обновлении приёма");
		} finally {
			setApptActionLoading(false);
		}
	}

	function handleCompleteTask() {
		if (!selectedOutcome) return;
		void completeCommunicationTask(task.id, selectedOutcome);
	}

	return (
		<article
			className={`communication-task priority-${task.priority}`}
			key={task.id}
		>
			<MessageSquare aria-hidden="true" />
			<div>
				<span>
					{communicationIntentLabels[task.intent]} ·{" "}
					{communicationChannelLabels[task.channel]} ·{" "}
					{staffRoleLabels[task.assignedRole]}
				</span>
				<h3>{task.title}</h3>
				<p>{task.body}</p>
				<small>
					{formatDateTime(task.dueAt)} ·{" "}
					{communicationPriorityLabels[task.priority]} ·{" "}
					{communicationStatusLabels[task.status]}
				</small>
			</div>
			{task.status === "completed" ? (
				<span className="status-pill status-completed">
					{task.lastOutcome
						? communicationTaskOutcomeLabels[task.lastOutcome]
						: "закрыто"}
				</span>
			) : (
				<div className="communication-task-actions">
					{linkedAppointment ? (
						<div
							className="appointment-confirm-widget"
							style={{
								borderLeft: "3px solid var(--teal)",
								paddingLeft: "10px",
								marginBottom: "10px",
							}}
						>
							<p
								style={{
									margin: "0 0 6px",
									fontSize: "13px",
									color: "var(--muted)",
								}}
							>
								Приём:{" "}
								<strong>{formatDateTime(linkedAppointment.startsAt)}</strong>
							</p>
							{apptActionDone ? (
								<span className={`status-pill status-${apptActionDone}`}>
									Приём{" "}
									{apptActionDone === "confirmed" ? "подтверждён" : "отменён"}
								</span>
							) : (
								<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
									<button
										type="button"
										className="primary-button"
										onClick={() => void handleConfirmAppointment("confirmed")}
										disabled={apptActionLoading || communicationSaveInProgress}
										aria-label="Подтвердить приём"
									>
										Подтвердил
									</button>
									<button
										type="button"
										className="secondary-button"
										onClick={() => void handleConfirmAppointment("cancelled")}
										disabled={apptActionLoading || communicationSaveInProgress}
										aria-label="Отменить приём"
									>
										Отменил
									</button>
								</div>
							)}
							{apptActionError ? (
								<p
									role="alert"
									style={{
										color: "var(--bad-fg, #b42318)",
										fontSize: "12px",
										marginTop: "4px",
									}}
								>
									{apptActionError}
								</p>
							) : null}
						</div>
					) : null}
					{documentKinds?.map((kind, index) => {
						const documentActionLabel =
							communicationDocumentTaskActionLabels[kind] ??
							documentLabels[kind];
						return (
							<button
								className={index === 0 ? "primary-button" : "secondary-button"}
								type="button"
								key={kind}
								onClick={() =>
									openCommunicationTaskDocumentWorkflow(task, kind)
								}
								aria-label={`${documentActionLabel}: ${task.title}`}
							>
								<FileText aria-hidden="true" /> {documentActionLabel}
							</button>
						);
					})}
					{isTaskSaving ? (
						<span
							className="communication-task-saving"
							id={savingStatusId}
							role="status"
							aria-live="polite"
						>
							Сохраняю в журнал
						</span>
					) : null}
					<div className="communication-outcome-select">
						<label
							htmlFor={outcomeSelectId}
							style={{
								fontSize: "13px",
								color: "var(--slate-500)",
								fontWeight: 500,
								marginBottom: "8px",
								display: "block",
							}}
						>
							Исход
						</label>
						<select
							id={outcomeSelectId}
							value={selectedOutcome}
							onChange={(e) =>
								setSelectedOutcome(e.target.value as CommunicationTaskOutcome)
							}
							style={{ display: "none" }} // keep chips visual but have a linked select for accessibility
						>
							<option value="">Выберите исход...</option>
							{communicationTaskOutcomeOptions?.map(([outcome, label]) => (
								<option key={outcome} value={outcome}>
									{label}
								</option>
							))}
						</select>
						<div className="quick-chips-row" style={{ flexWrap: "wrap" }}>
							{communicationTaskOutcomeOptions?.map(([outcome, label]) => (
								<button
									key={outcome}
									type="button"
									className={`quick-chip ${selectedOutcome === outcome ? "selected" : ""}`}
									onClick={() =>
										setSelectedOutcome(outcome as CommunicationTaskOutcome)
									}
									disabled={communicationSaveInProgress}
								>
									{label}
								</button>
							))}
						</div>
					</div>
					<button
						aria-label={`Закрыть задачу связи: ${task.title}`}
						aria-busy={isTaskSaving || undefined}
						aria-describedby={
							isTaskSaving
								? `${completionNoteDescriptionId} ${savingStatusId}`
								: completionNoteDescriptionId
						}
						className="secondary-button"
						type="button"
						onClick={handleCompleteTask}
						disabled={communicationSaveInProgress || !selectedOutcome}
					>
						<CheckCircle2 aria-hidden="true" />{" "}
						{isTaskSaving ? "Закрываю" : "Закрыть"}
					</button>
				</div>
			)}
		</article>
	);
}

function _CommunicationTemplateRow({
	communicationChannelLabels,
	staffRoleLabels,
	template,
}: {
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	staffRoleLabels: Record<StaffRole, string>;
	template: CommunicationTemplate;
}) {
	return (
		<article key={template.id}>
			<Send aria-hidden="true" />
			<div>
				<strong>{template.title}</strong>
				<p>
					{communicationChannelLabels[template.channel]} ·{" "}
					{staffRoleLabels[template.audienceRole]}
				</p>
			</div>
		</article>
	);
}

function CommunicationEventRow({
	communicationChannelLabels,
	communicationStatusLabels,
	event,
	formatDateTime,
}: {
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	communicationStatusLabels: Record<CommunicationTask["status"], string>;
	event: CommunicationEvent;
	formatDateTime: (value: string) => string;
}) {
	/*
    БЫЛО: строка журнала показывала только канал и статус словарём. Доставленное
    и упавшее сообщение выглядели одинаково, а `direction` не выводился вовсе —
    ответ пациента было не отличить от отправки клиники. Теперь у каждой записи
    видно, кто кому, а у неудачных и неподтверждённых — что делать дальше.
  */
	const notice = journalEntryNotice(event);
	const isUndelivered = event.status === "failed" || event.status === "skipped";
	return (
		<article key={event.id} data-status={event.status}>
			<History aria-hidden="true" />
			<div>
				<strong>
					{journalDirectionLabel(event.direction)} ·{" "}
					{communicationChannelLabels[event.channel]} ·{" "}
					<span
						className={
							isUndelivered
								? "text-[var(--bad-fg,#b42318)] font-semibold"
								: undefined
						}
					>
						{communicationStatusLabels[event.status]}
					</span>
				</strong>
				<p>
					{event.message} · {formatDateTime(event.createdAt)}
				</p>
				{notice ? (
					<p
						className={
							isUndelivered
								? "text-xs text-[var(--bad-fg,#b42318)] font-semibold"
								: "text-xs text-[var(--muted)]"
						}
						role={isUndelivered ? "alert" : undefined}
					>
						{notice}
					</p>
				) : null}
			</div>
		</article>
	);
}

export function CommunicationsView({
	communicationChannelLabels,
	communicationDocumentTaskActionLabels,
	communicationIntentLabels,
	communicationNote,
	communicationPriorityLabels,
	communicationSavingTaskId,
	communicationStatusLabels,
	completeCommunicationTask,
	dashboard,
	documentKindsForCommunicationTask,
	documentLabels,
	formatDateTime,
	onCommunicationNoteChange,
	onGoToSchedule,
	openCommunicationTaskDocumentWorkflow,
	sortedCommunicationTasks,
	staffRoleLabels,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
}: any = {}) {
	const communicationNoteInputId = "communication-closing-note";
	const communicationNoteDescriptionId = "communication-closing-note-guidance";
	// Режим клиники решает, какие разделы уместны. Пока профиль не загружен,
	// режим не известен — тогда показывается всё (см. clinicCapabilities).
	const clinicMode = dashboard?.clinicSettings?.profile?.mode ?? null;

	/*
    Журнал разбирается ДО подстановки пустого массива. Прежняя разметка начинала
    с `dashboard?.communicationEvents ?? []`, и этим первым же действием теряла
    различие между «сервер вернул пустой список» и «в ответе списка не было
    вовсе»: и то и другое превращалось в ноль записей без единого слова на
    экране. Ответ /api/dashboard на клиенте не проверяется схемой, а приводится
    (`as Dashboard` в useAppLogic), поэтому отсутствующее поле — не гипотеза.
  */
	const journal = summarizeJournal<CommunicationEvent>(
		dashboard?.communicationEvents,
	);

	/*
    «Заметка заряжена»: в поле есть непробельный текст, значит при следующем
    закрытии задачи он уйдёт на сервер. Проверка по trim, а не по длине: строка
    из пробелов на сервере превратится в «Задача связи закрыта.» и предупреждать
    о ней не о чем.
  */
	const closingNoteArmed =
		typeof communicationNote === "string" &&
		communicationNote.trim().length > 0;

	const communicationSummaryHasNumbers = Boolean(
		(dashboard?.communicationSummary?.openTasks ?? 0) ||
			(dashboard?.communicationSummary?.dueToday ?? 0) ||
			(dashboard?.communicationSummary?.overdue ?? 0) ||
			(dashboard?.communicationSummary?.urgentTasks ?? 0) ||
			(dashboard?.communicationSummary?.appointmentConfirmations ?? 0) ||
			(dashboard?.communicationSummary?.postVisitInstructions ?? 0),
	);

	return (
		<div
			className="panel communications-panel"
			id="communications"
			data-testid="communications-view"
		>
			<div className="panel-heading">
				<h2 title="Центр коммуникаций с пациентами: подтверждения визитов, рассылки, чаты и звонки">
					Связь с пациентами
				</h2>
				<button
					className="text-button"
					type="button"
					onClick={onGoToSchedule}
					title="Перейти к сетке расписания"
				>
					Расписание
				</button>
			</div>

			{/*
        Сводка из четырёх счётчиков нужна тогда, когда в ней есть хоть что-то.
        В клинике без задач связи это были четыре нуля в ряд — они занимали
        верх экрана и не сообщали ничего, кроме того, что и так видно по
        пустому списку ниже. Показываем сводку, когда есть о чём сводить.
      */}
			{communicationSummaryHasNumbers ? (
				<section
					className="communications-summary-grid"
					aria-label="Сводка связи"
				>
					<article
						className={
							dashboard?.communicationSummary?.urgentTasks
								? "communication-urgent"
								: ""
						}
					>
						<span>Открыто</span>
						<strong>{dashboard?.communicationSummary?.openTasks ?? 0}</strong>
						<p>
							{countLabel(
								dashboard?.communicationSummary?.urgentTasks ?? 0,
								"срочная",
								"срочные",
								"срочных",
							)}
						</p>
					</article>
					<article>
						<span>Сегодня</span>
						<strong>{dashboard?.communicationSummary?.dueToday ?? 0}</strong>
						<p>
							{countLabel(
								dashboard?.communicationSummary?.overdue ?? 0,
								"просрочена",
								"просрочены",
								"просрочено",
							)}
						</p>
					</article>
					<article>
						<span>Подтверждения</span>
						<strong>
							{dashboard?.communicationSummary?.appointmentConfirmations ?? 0}
						</strong>
						<p>записи и первичные визиты</p>
					</article>
					<article>
						<span>После приема</span>
						<strong>
							{dashboard?.communicationSummary?.postVisitInstructions ?? 0}
						</strong>
						<p>инструкции пациентам</p>
					</article>
				</section>
			) : null}

			{/*
        Поле заметки нужно только при закрытии задачи связи: оно уходит в
        `POST /api/communications/tasks/complete` вместе с taskId. Раньше блок
        висел на экране всегда — и у клиники без единой задачи это была форма
        без объекта: «Заметка закрытия» чего, если закрывать нечего.

        НО ОДНОГО УСЛОВИЯ «ЕСТЬ ЗАДАЧИ» НЕДОСТАТОЧНО. Заметка живёт в состоянии
        useAppLogic и после закрытия задачи НЕ очищается: закрыли последнюю
        задачу — блок исчез, а набранный текст остался в состоянии и приложится
        к следующей задаче, которая появится в очереди. Текст, который уйдёт в
        журнал клиники, не имеет права быть невидимым, поэтому блок показывается
        и тогда, когда очередь пуста, но в заметке что-то есть.
      */}
			{(sortedCommunicationTasks ?? []).length || closingNoteArmed ? (
				<div className="communication-note-row bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-4 mb-5">
					<div className="flex justify-between items-center mb-3">
						<div>
							<label
								htmlFor={communicationNoteInputId}
								className="text-sm font-semibold text-[var(--ink)] block"
							>
								Что сказал пациент
							</label>
							{/*
              БЫЛО: «Запись попадёт в задачу, которую вы закроете ниже». Про
              главное свойство поля не говорилось ничего: заметка одна на весь
              экран и после закрытия задачи остаётся на месте. Администратор
              закрывал задачу пациента А с заметкой «перезвонить в пятницу»,
              потом закрывал задачу пациента Б — и та же фраза уходила в журнал
              пациента Б. Ложная запись в журнале клиники. Пока очистка после
              успешного закрытия не сделана в useAppLogic (это вне этого файла),
              экран обязан хотя бы не умалчивать об этом и дать кнопку очистки.
            */}
							<span
								id={communicationNoteDescriptionId}
								className="text-xs text-[var(--muted)]"
							>
								Запись приложится к той задаче, которую вы закроете ниже, и
								останется в журнале клиники. Если поле пустое, в журнал уйдёт
								«Задача связи закрыта.»
							</span>
						</div>
						<SmartMicrophoneButton
							context="general"
							onResult={(t) => {
								const prev = communicationNote || "";
								onCommunicationNoteChange(prev ? `${prev}, ${t}` : t);
							}}
							className="inline-flex gap-1.5 items-center px-3 py-1.5 text-[var(--teal-dark,#0f766e)] bg-[var(--teal-soft,#ccfbf1)] border-none rounded-lg font-semibold text-xs hover:opacity-80 transition-opacity"
						/>
					</div>
					<textarea
						id={communicationNoteInputId}
						value={communicationNote}
						onChange={(event) => onCommunicationNoteChange(event.target.value)}
						aria-describedby={communicationNoteDescriptionId}
						placeholder="Нажмите для ввода или надиктуйте результат связи..."
						rows={2}
						className="w-full p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm resize-y mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
					/>
					{/*
          Строка появляется только когда в заметке есть текст, то есть ровно в
          тот момент, когда она может уйти не тому пациенту. Кнопка очистки —
          единственный способ убрать заметку, кроме выделения текста руками:
          после закрытия задачи поле остаётся заполненным.
        */}
					{closingNoteArmed ? (
						<div className="flex flex-wrap items-center justify-between gap-2 mb-3">
							<span className="text-xs font-semibold text-[var(--bad-fg,#b42318)]">
								Заметка заполнена и приложится к следующей закрытой задаче —
								даже если она уже про другого пациента.
							</span>
							<button
								type="button"
								className="secondary-button text-xs"
								onClick={() => onCommunicationNoteChange("")}
							>
								Очистить заметку
							</button>
						</div>
					) : null}
					<div className="quick-chips-row flex-wrap gap-2">
						<span className="text-xs text-[var(--muted)] self-center mr-1">
							Шаблоны:
						</span>
						{[
							"Недозвон",
							"Обещал оплатить",
							"Подумает",
							"Перезвонить позже",
							"Запрос документов",
						]?.map((chip) => (
							<button
								key={chip}
								type="button"
								className="quick-chip focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all hover:scale-[1.02]"
								onClick={() => {
									const prev = communicationNote || "";
									onCommunicationNoteChange(
										prev ? `${prev}, ${chip.toLowerCase()}` : chip,
									);
								}}
							>
								+ {chip}
							</button>
						))}
					</div>
				</div>
			) : null}

			{/*
        Пульт отправки: настоящие шлюзы, журнал с причиной отказа, редактор
        шаблонов и правила рассылки.

        Рассылки по базе показываются не всем. Отдельному врачу они не нужны —
        его режим описан как «минимум экранов», маркетинга у него нет, а лишний
        раздел на экране стоит дороже, чем отсутствующая возможность. Решение
        принимает таблица режимов в lib/clinicCapabilities.ts, а не сравнение
        строк здесь.
      */}
			<MessageDeliveryConsole />
			{hasCapability(clinicMode, "massCampaigns") ? <CampaignPanel /> : null}

			<div className="communication-layout">
				<section className="communication-task-list" aria-label="Очередь связи">
					{(sortedCommunicationTasks ?? []).length ? (
						(sortedCommunicationTasks ?? [])?.map((task) => (
							<CommunicationTaskCard
								communicationChannelLabels={communicationChannelLabels}
								communicationDocumentTaskActionLabels={
									communicationDocumentTaskActionLabels
								}
								communicationIntentLabels={communicationIntentLabels}
								communicationPriorityLabels={communicationPriorityLabels}
								communicationSavingTaskId={communicationSavingTaskId}
								communicationStatusLabels={communicationStatusLabels}
								completionNoteDescriptionId={communicationNoteDescriptionId}
								completeCommunicationTask={completeCommunicationTask}
								documentKinds={documentKindsForCommunicationTask(task)}
								documentLabels={documentLabels}
								formatDateTime={formatDateTime}
								key={task.id}
								openCommunicationTaskDocumentWorkflow={
									openCommunicationTaskDocumentWorkflow
								}
								staffRoleLabels={staffRoleLabels}
								task={task}
								appointments={dashboard.appointments}
							/>
						))
					) : (
						<EmptyState
							title="Очередь связи пуста"
							description="Когда появятся подтверждения, запросы документов или инструкции после приема, они отобразятся здесь."
							action={
								<button
									className="text-button"
									type="button"
									onClick={onGoToSchedule}
								>
									Открыть расписание
								</button>
							}
							className="my-4 py-8"
						/>
					)}
				</section>

				<aside className="communication-side">
					{/*
            ЗДЕСЬ БЫЛ ВТОРОЙ СПИСОК ШАБЛОНОВ — и он показывал выдумку.
            Блок читал dashboard.communicationTemplates, а живой ответ
            /api/dashboard отдаёт по этому полю четыре примера, зашитых в
            sampleData.ts: их идентификаторы «tpl-appo», «tpl-paym»,
            «tpl-post», «tpl-reca» вместо настоящих UUID — проверено запросом.
            То есть на одном экране рядом стояли настоящие шаблоны из базы (в
            консоли отправки, по ним реально уходят сообщения) и четыре
            несуществующих. Администратор видел «Подтверждение приёма —
            WhatsApp» и мог решить, что оно настроено, хотя WhatsApp не
            подключён вовсе, а такого шаблона в базе нет.

            Два источника правды на одном экране опаснее отсутствия одного из
            них: правку вносят в тот список, а рассылка идёт по этому.
            Настоящий список остаётся в MessageDeliveryConsole на том же экране,
            там же его можно менять.
          */}

					{/*
            ЖУРНАЛ СВЯЗИ. Раньше здесь стояла зелёная плашка `status-confirmed` с
            одним числом — длиной массива событий, — и список одинаковых строк.
            Клиника, у которой из двенадцати сообщений три упали с отказом
            шлюза, видела спокойную зелёную «12»: недоставленное считалось
            наравне с доставленным и ничем от него не отличалось. Это отказ
            отправки, показанный как успех, то есть пропущенный приём.

            А когда событий не было или сервер ответил без списка, на месте
            журнала оставался пустой блок с зелёным нулём — ни строки текста.
            «Не прочитано» выглядело так же, как «сообщений не было».

            Решение о числах, цвете плашки и текстах трёх состояний вынесено в
            journalDigest.ts и проверяется node:test — здесь только разметка.
          */}
					<section aria-label="Журнал связи">
						<div className="panel-heading">
							<h3>Журнал связи</h3>
							<span className={journal.totalPillClass}>
								{journal.totalLabel}
							</span>
						</div>
						{journal.undeliveredLabel ? (
							<p
								className="text-xs font-semibold text-[var(--bad-fg,#b42318)] mb-2"
								role="alert"
							>
								{journal.undeliveredLabel} — пациенты этого не получили. Причина
								отказа по каждому сообщению видна в «Отправке сообщений», раздел
								«Журнал отправки».
							</p>
						) : null}
						{journal.pendingLabel ? (
							<p className="text-xs text-[var(--muted)] mb-2">
								{journal.pendingLabel}.
							</p>
						) : null}
						{journal.phase === "failed" ? (
							<div
								role="alert"
								className="p-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
							>
								<div className="font-semibold">{journal.title}.</div>
								<div className="mt-0.5">{journal.hint}</div>
							</div>
						) : journal.phase === "empty" ? (
							<EmptyState
								title={journal.title}
								description={journal.hint}
								className="my-2 py-6"
							/>
						) : (
							<div className="template-list">
								{journal.entries?.map((event) => (
									<CommunicationEventRow
										communicationChannelLabels={communicationChannelLabels}
										communicationStatusLabels={communicationStatusLabels}
										event={event}
										formatDateTime={formatDateTime}
										key={event.id}
									/>
								))}
							</div>
						)}
					</section>
				</aside>
			</div>

			{/*
        ЗДЕСЬ БЫЛА СЕТКА ИЗ 14 ВИДЖЕТОВ. Убрана после проверки живыми запросами:

          404 (маршрута не существует вовсе) — 9 штук:
            appointment-channel-inheritances, chat-message-dispatch-statuses,
            collaborative-chat-processing-states, message-template-catalogs,
            messenger-file-attachments, previous-chat-dialog-histories,
            uis-call-speech-transcripts, uis-mass-appointment-confirmations,
            uis-sms-chat-quotas
          200 с пустым массивом (таблицы пусты) — 5 штук:
            email-dispatch-logs, quick-appointment-confirmations,
            uis-omni-messenger-queues, confirmation-performance-reports,
            prodoctorov-sync

        То есть все четырнадцать показывали «данные отсутствуют» и занимали
        четыре экрана прокрутки под рабочими панелями. Их назначение уже
        закрыто настоящими инструментами выше:
          справочник шаблонов        → редактор в «Отправке сообщений»
          логи отправки по e-mail    → журнал очереди с причиной отказа
          квоты SMS                  → остаток на счету в состоянии шлюзов
          массовое подтверждение     → «Рассылки»
          отчёт по подтверждениям    → «Обзвон и подтверждения» и отчёты

        Дописывать девять отсутствующих маршрутов ради виджетов, которых никто
        не просил, значило бы выдумывать контракты. Файлы виджетов удалены —
        последним ConfirmationPerformanceReportsWidget, который до этого
        оставался ради аналитики и смены: его таблица
        confirmation_performance_reports тоже без единого писателя, и на всех
        трёх экранах он показывал одну и ту же пустоту.
      */}
		</div>
	);
}
