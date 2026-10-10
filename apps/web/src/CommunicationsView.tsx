import type {
	CommunicationTaskOutcome,
	Dashboard,
	GeneratedDocument,
	StaffRole,
} from "@dental/shared";
import {
	Bell,
	Bot,
	Calendar,
	MessageSquare,
	Radio,
	Send,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useIsMobile } from "./hooks/useIsMobile";
import { MobileCommunicationsMessenger } from "./components/communications/MobileCommunicationsMessenger";
import { CommunicationEventRow } from "./components/communications/CommunicationEventRow";
import { CommunicationTaskCard } from "./components/communications/CommunicationTaskCard";
import { CampaignPanel } from "./components/communications/CampaignPanel";

const OmnichannelOperatorDesk = lazy(() =>
	import("./components/chat/OmnichannelOperatorDesk").then((module) => ({
		default: module.OmnichannelOperatorDesk,
	})),
);

const StaffMessengerPanel = lazy(() =>
	import("./components/communications/StaffMessengerPanel").then((module) => ({
		default: module.StaffMessengerPanel,
	})),
);

const WhatsAppChatPanel = lazy(() =>
	import("./components/chat/WhatsAppChatPanel").then((module) => ({
		default: module.WhatsAppChatPanel,
	})),
);
const PatientNotificationCenter = lazy(() =>
	import("./components/notifications/PatientNotificationCenter").then((module) => ({
		default: module.PatientNotificationCenter,
	})),
);

const PatientRecallsHubModal = lazy(() =>
	import("./components/recalls/PatientRecallsHubModal").then((module) => ({
		default: module.PatientRecallsHubModal,
	})),
);
const PatientOmnichannelHubModal = lazy(() =>
	import("./components/messaging/PatientOmnichannelHubModal").then((module) => ({
		default: module.PatientOmnichannelHubModal,
	})),
);
import {
	journalDirectionLabel,
	journalEntryNotice,
	summarizeJournal,
} from "./components/communications/journalDigest";
import { MessageDeliveryConsole } from "./components/communications/MessageDeliveryConsole";
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { hasCapability } from "./lib/clinicCapabilities";
import { denteAdminSecretRequestHeaders } from "./lib/denteRequestHeaders";
import { countLabel } from "./lib/russianPlural";
import { useSettingsStore } from "./store/settingsStore";
import { sliceDomList } from "./utils/domVirtualizationHelper";

type CommunicationTask = Dashboard["communicationTasks"][number];
type CommunicationTemplate = Dashboard["communicationTemplates"][number];
type CommunicationEvent = Dashboard["communicationEvents"][number];

export type CommunicationsViewProps = {
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

export function CommunicationsView(
	rawProps?: Partial<CommunicationsViewProps>,
) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<
		typeof useAppLogicContext
	> &
		Partial<CommunicationsViewProps>;
	const {
		communicationChannelLabels,
		communicationDocumentTaskActionLabels,
		communicationIntentLabels,
		communicationNote = props.communicationNote ?? "",
		communicationPriorityLabels,
		communicationSavingTaskId = props.communicationSavingTaskId ?? null,
		communicationStatusLabels,
		completeCommunicationTask,
		dashboard,
		documentKindsForCommunicationTask,
		documentLabels,
		formatDateTime,
		onCommunicationNoteChange = props.onCommunicationNoteChange ??
			(props as any).setCommunicationNote ??
			(() => {}),
		onGoToSchedule = props.onGoToSchedule ??
			(() => {
				window.location.hash = "schedule";
			}),
		openCommunicationTaskDocumentWorkflow,
		sortedCommunicationTasks,
		staffRoleLabels,
	} = props;
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

	const [activeSection, setActiveSection] = useState<
		"tasks" | "chat" | "notifications" | "staff_chat" | "bot_inbox"
	>(() => {
		if (typeof window !== "undefined") {
			const hash = window.location.hash || "";
			const search = window.location.search || "";
			if (
				hash.includes("bot_inbox") ||
				hash.includes("bots") ||
				search.includes("bot_inbox") ||
				search.includes("bots")
			) {
				return "bot_inbox";
			}
			if (hash.includes("chat") || search.includes("chat")) return "chat";
			if (hash.includes("notifications") || search.includes("notifications")) return "notifications";
			if (hash.includes("staff_chat") || search.includes("staff_chat")) return "staff_chat";
		}
		return "tasks";
	});

	useEffect(() => {
		const handleHash = () => {
			const hash = window.location.hash || "";
			if (hash.includes("bot_inbox") || hash.includes("bots")) {
				setActiveSection("bot_inbox");
			} else if (hash.includes("chat")) {
				setActiveSection("chat");
			} else if (hash.includes("notifications")) {
				setActiveSection("notifications");
			} else if (hash.includes("staff_chat")) {
				setActiveSection("staff_chat");
			}
		};
		window.addEventListener("hashchange", handleHash);
		return () => window.removeEventListener("hashchange", handleHash);
	}, []);
	const [tasksLimit, setTasksLimit] = useState(30);
	const [journalLimit, setJournalLimit] = useState(40);
	const [isRecallsHubOpen, setIsRecallsHubOpen] = useState(false);
	const [isOmnichannelHubOpen, setIsOmnichannelHubOpen] = useState(false);

	const effectiveTasks =
		Array.isArray(sortedCommunicationTasks) && sortedCommunicationTasks.length > 0
			? sortedCommunicationTasks
			: (dashboard?.communicationTasks ?? []);
	const tasksSlice = sliceDomList(effectiveTasks, tasksLimit, 0);
	const journalSlice = sliceDomList(journal.entries ?? [], journalLimit, 0);

	const communicationSummaryHasNumbers = Boolean(
		(dashboard?.communicationSummary?.openTasks ?? 0) ||
			(dashboard?.communicationSummary?.dueToday ?? 0) ||
			(dashboard?.communicationSummary?.overdue ?? 0) ||
			(dashboard?.communicationSummary?.urgentTasks ?? 0) ||
			(dashboard?.communicationSummary?.appointmentConfirmations ?? 0) ||
			(dashboard?.communicationSummary?.postVisitInstructions ?? 0)
	);
	const isMobile = useIsMobile(768);

	if (isMobile) {
		return (
			<div
				className="mobile-communications-container"
				style={{ width: "100%", maxWidth: "100vw", overflowX: "clip" }}
				data-testid="communications-view"
			>
				<MobileCommunicationsMessenger
					dashboard={dashboard}
					onGoToSchedule={onGoToSchedule}
					completeCommunicationTask={completeCommunicationTask}
					communicationNote={communicationNote}
					onCommunicationNoteChange={onCommunicationNoteChange}
					communicationSavingTaskId={communicationSavingTaskId}
					openCommunicationTaskDocumentWorkflow={openCommunicationTaskDocumentWorkflow}
					communicationChannelLabels={communicationChannelLabels}
					communicationPriorityLabels={communicationPriorityLabels}
					communicationIntentLabels={communicationIntentLabels}
					communicationStatusLabels={communicationStatusLabels}
					documentKindsForCommunicationTask={documentKindsForCommunicationTask}
					documentLabels={documentLabels}
					staffRoleLabels={staffRoleLabels}
					formatDateTime={formatDateTime}
				/>
				{isRecallsHubOpen && (
					<Suspense fallback={null}>
						<PatientRecallsHubModal
							isOpen={isRecallsHubOpen}
							onClose={() => setIsRecallsHubOpen(false)}
						/>
					</Suspense>
				)}
				{isOmnichannelHubOpen && (
					<Suspense fallback={null}>
						<PatientOmnichannelHubModal
							isOpen={isOmnichannelHubOpen}
							onClose={() => setIsOmnichannelHubOpen(false)}
							portal={true}
						/>
					</Suspense>
				)}
			</div>
		);
	}

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
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setIsRecallsHubOpen(true)}
						className="secondary-button"
						data-testid="communications-recalls-hub-btn"
						title="Профосмотры и реколлы: плановый контроль и удержание"
					>
						<Calendar size={14} className="text-teal-600 dark:text-teal-400" />
						<span>Профосмотры и реколлы</span>
					</button>
					<button
						type="button"
						onClick={() => setIsOmnichannelHubOpen(true)}
						className="secondary-button"
						data-testid="communications-omnichannel-hub-btn"
						title="Омниканальный чат с пациентом (WhatsApp / Telegram / SMS)"
					>
						<MessageSquare size={14} className="text-teal-600 dark:text-teal-400" />
						<span>Омниканальный чат с пациентом</span>
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={onGoToSchedule}
						title="Перейти к сетке расписания"
					>
						<span>Расписание</span>
					</button>
				</div>
			</div>

			{/* Sub-navigation tabs: Tasks & Dispatch, WhatsApp Direct Chat, Notifications Center, and Staff Messenger */}
			<div className="dente-segmented-bar w-full mb-5 overflow-x-auto scrollbar-none flex">
				<button
					type="button"
					onClick={() => setActiveSection("tasks")}
					className={`dente-segmented-item flex-1 shrink-0 ${
						activeSection === "tasks" ? "active" : ""
					}`}
					data-active={activeSection === "tasks"}
				>
					<MessageSquare size={13} />
					<span>Очередь задач и рассылки</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSection("chat")}
					className={`dente-segmented-item flex-1 shrink-0 ${
						activeSection === "chat" ? "active" : ""
					}`}
					data-active={activeSection === "chat"}
				>
					<Send size={13} />
					<span>WhatsApp Чат</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSection("bot_inbox")}
					className={`dente-segmented-item flex-1 shrink-0 ${
						activeSection === "bot_inbox" ? "active" : ""
					}`}
					data-active={activeSection === "bot_inbox"}
					data-testid="communications-tab-bot-inbox"
				>
					<Bot size={13} />
					<span>Пульт ботов (TG/VK/WA/MAX)</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSection("notifications")}
					className={`dente-segmented-item flex-1 shrink-0 ${
						activeSection === "notifications" ? "active" : ""
					}`}
					data-active={activeSection === "notifications"}
				>
					<Bell size={13} />
					<span>Центр уведомлений</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSection("staff_chat")}
					className={`dente-segmented-item flex-1 shrink-0 ${
						activeSection === "staff_chat" ? "active" : ""
					}`}
					data-active={activeSection === "staff_chat"}
					data-testid="communications-tab-staff-chat"
				>
					<Radio size={13} />
					<span>Чат клиники / Интерком</span>
				</button>
			</div>

			{activeSection === "bot_inbox" && (
				<div className="mb-5">
					<Suspense fallback={null}>
						<OmnichannelOperatorDesk />
					</Suspense>
				</div>
			)}

			{activeSection === "staff_chat" && (
				<div className="h-[780px] mb-5">
					<Suspense fallback={null}>
						<StaffMessengerPanel />
					</Suspense>
				</div>
			)}

			{activeSection === "chat" && (
				<div className="h-[750px] mb-5">
					<Suspense fallback={null}>
						<WhatsAppChatPanel />
					</Suspense>
				</div>
			)}

			{activeSection === "notifications" && (
				<div className="h-[750px] mb-5">
					<Suspense fallback={null}>
						<PatientNotificationCenter />
					</Suspense>
				</div>
			)}

			{activeSection === "tasks" && (
				<>
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
								<strong>
									{dashboard?.communicationSummary?.openTasks ?? 0}
								</strong>
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
								<strong>
									{dashboard?.communicationSummary?.dueToday ?? 0}
								</strong>
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
									{dashboard?.communicationSummary?.appointmentConfirmations ??
										0}
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
					{effectiveTasks.length || closingNoteArmed ? (
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
										останется в журнале клиники. Если поле пустое, в журнал
										уйдёт «Задача связи закрыта.»
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
								onChange={(event) =>
									onCommunicationNoteChange(event.target.value)
								}
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

					<div className="communication-layout mb-5">
						<section
							className="communication-task-list"
							aria-label="Очередь связи"
						>
							{(tasksSlice.visibleItems ?? []).length ? (
								<>
									{(tasksSlice.visibleItems ?? []).map((task: any) => (
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
									))}
									{tasksSlice.hasMore && (
										<div className="flex justify-center p-3">
											<button
												type="button"
												data-testid="btn-communications-tasks-show-more"
												onClick={() => setTasksLimit((prev) => prev + 30)}
												className="min-h-[44px] sm:min-h-[34px] px-4 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all shadow-xs"
											>
												Показать ещё 30 задач (показано {tasksSlice.visibleItems.length} из {tasksSlice.totalCount})
											</button>
										</div>
									)}
								</>
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
										{journal.undeliveredLabel} — пациенты этого не получили.
										Причина отказа по каждому сообщению видна в «Отправке
										сообщений», раздел «Журнал отправки».
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
										{journalSlice.visibleItems?.map((event) => (
											<CommunicationEventRow
												communicationChannelLabels={communicationChannelLabels}
												communicationStatusLabels={communicationStatusLabels}
												event={event}
												formatDateTime={formatDateTime}
												key={event.id}
											/>
										))}
										{journalSlice.hasMore && (
											<div className="flex justify-center p-2">
												<button
													type="button"
													data-testid="btn-communications-journal-show-more"
													onClick={() => setJournalLimit((prev) => prev + 40)}
													className="min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-all"
												>
													Показать ещё 40 записей
												</button>
											</div>
										)}
									</div>
								)}
							</section>
						</aside>
					</div>

					<MessageDeliveryConsole />
					{hasCapability(clinicMode, "massCampaigns") ? (
						<CampaignPanel />
					) : null}
				</>
			)}

			{isRecallsHubOpen && (
				<Suspense fallback={null}>
					<PatientRecallsHubModal
						isOpen={isRecallsHubOpen}
						onClose={() => setIsRecallsHubOpen(false)}
					/>
				</Suspense>
			)}

			{isOmnichannelHubOpen && (
				<Suspense fallback={null}>
					<PatientOmnichannelHubModal
						isOpen={isOmnichannelHubOpen}
						onClose={() => setIsOmnichannelHubOpen(false)}
						portal={true}
					/>
				</Suspense>
			)}
		</div>
	);
}
