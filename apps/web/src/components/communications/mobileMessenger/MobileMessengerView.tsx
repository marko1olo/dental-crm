import React from "react";
import { CheckCheck, FileText } from "lucide-react";
import { CommunicationTaskCard } from "../CommunicationTaskCard";
import { CommunicationEventRow } from "../CommunicationEventRow";
import { OmnichannelOperatorDesk } from "../../chat/OmnichannelOperatorDesk";
import { MessengerHeaderBar } from "./MessengerHeaderBar";
import { DialogsFeedView } from "./DialogsFeedView";
import { FullscreenChatView } from "./FullscreenChatView";
import type { MobileCommunicationsMessengerProps } from "./types";
import type { useMobileMessengerLogic } from "./useMobileMessengerLogic";

export interface MobileMessengerViewProps {
	props: MobileCommunicationsMessengerProps;
	logic: ReturnType<typeof useMobileMessengerLogic>;
}

export const MobileMessengerView: React.FC<MobileMessengerViewProps> = ({
	props,
	logic,
}) => {
	const {
		dashboard,
		onGoToSchedule,
		completeCommunicationTask,
		communicationSavingTaskId = null,
		openCommunicationTaskDocumentWorkflow,
		communicationChannelLabels = {
			whatsapp: "WhatsApp",
			telegram: "Telegram",
			sms: "SMS",
			max: "MAX",
			phone: "Телефон",
			email: "Email",
		},
		communicationPriorityLabels = {
			urgent: "Срочно",
			normal: "Обычный",
			low: "Низкий",
		},
		communicationIntentLabels,
		communicationStatusLabels = {
			pending: "Ожидает",
			in_progress: "В работе",
			completed: "Завершено",
			cancelled: "Отменено",
		},
		documentKindsForCommunicationTask = () => [],
		documentLabels = {},
		staffRoleLabels = {},
		formatDateTime = (val: string) => new Date(val).toLocaleString("ru-RU"),
	} = props;

	return (
		<div className="mobile-messenger-root" data-testid="mobile-communications-messenger">
			{/* ─── Top Header (Safe Area Protected) ─── */}
			<MessengerHeaderBar
				activeSection={logic.activeSection}
				setActiveSection={logic.setActiveSection}
				dialogsCount={logic.serverDialogs.length}
				tasksCount={logic.communicationTasks.length}
				eventsCount={logic.communicationEvents.length}
				isSearchOpen={logic.isSearchOpen}
				setIsSearchOpen={logic.setIsSearchOpen}
				onGoToSchedule={onGoToSchedule}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			   VIEW 1: ДИАЛОГИ (PATIENT DIALOGS FEED)
			   ═══════════════════════════════════════════════════════════════════ */}
			{logic.activeSection === "dialogs" && (
				<DialogsFeedView
					isSearchOpen={logic.isSearchOpen}
					searchQuery={logic.searchQuery}
					setSearchQuery={logic.setSearchQuery}
					channelFilter={logic.channelFilter}
					setChannelFilter={logic.setChannelFilter}
					filteredDialogs={logic.filteredDialogs}
					onSelectDialog={logic.handleSelectDialog}
				/>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			   VIEW 2: ОЧЕРЕДЬ ЗАДАЧ И ОБЗВОН (MOBILE TASKS QUEUE)
			   ═══════════════════════════════════════════════════════════════════ */}
			{logic.activeSection === "tasks" && (
				<main className="mobile-dialogs-container pt-3">
					{logic.communicationTasks.length > 0 ? (
						<div className="flex flex-col gap-3">
							{logic.communicationTasks.map((task: any) => (
								<CommunicationTaskCard
									key={task.id}
									task={task}
									communicationChannelLabels={communicationChannelLabels}
									communicationDocumentTaskActionLabels={{}}
									communicationIntentLabels={
										(communicationIntentLabels as any) || {
											general: "Связь",
											appointment_confirmation: "Подтверждение записи",
											callback_requested: "Перезвонить",
											payment_reminder: "Напоминание об оплате",
											post_visit_instruction: "После приёма",
											recall: "Профосмотр",
											document_ready: "Документы готовы",
											imaging_review: "Контроль снимка",
											lead_capture: "Обращение",
											transactional_reply: "Ответ",
										}
									}
									communicationPriorityLabels={communicationPriorityLabels}
									communicationSavingTaskId={communicationSavingTaskId}
									communicationStatusLabels={communicationStatusLabels}
									completionNoteDescriptionId="mobile-comm-note-desc"
									completeCommunicationTask={completeCommunicationTask || (() => {})}
									documentKinds={documentKindsForCommunicationTask(task)}
									documentLabels={documentLabels}
									formatDateTime={formatDateTime}
									openCommunicationTaskDocumentWorkflow={
										openCommunicationTaskDocumentWorkflow || (() => {})
									}
									staffRoleLabels={staffRoleLabels}
									appointments={dashboard.appointments}
								/>
							))}
						</div>
					) : (
						<div className="p-8 text-center text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)] my-4">
							<CheckCheck size={36} className="mx-auto mb-2 text-teal-600/60" />
							<div className="font-semibold text-[var(--ink)]">Очередь задач пуста</div>
							<div className="text-xs mt-1">Все подтверждения визитов и звонки успешно обработаны.</div>
						</div>
					)}
				</main>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			   VIEW 3: ЖУРНАЛ СВЯЗИ (MOBILE JOURNAL & OUTBOX LOG)
			   ═══════════════════════════════════════════════════════════════════ */}
			{logic.activeSection === "journal" && (
				<main className="mobile-dialogs-container pt-3">
					{logic.communicationEvents.length > 0 ? (
						<div className="mobile-dialogs-card">
							{logic.communicationEvents.map((ev: any) => (
								<CommunicationEventRow
									key={ev.id}
									event={ev}
									communicationChannelLabels={communicationChannelLabels}
									communicationStatusLabels={communicationStatusLabels}
									formatDateTime={formatDateTime}
								/>
							))}
						</div>
					) : (
						<div className="p-8 text-center text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)] my-4">
							<FileText size={36} className="mx-auto mb-2 text-teal-600/60" />
							<div className="font-semibold text-[var(--ink)]">Журнал связи пуст</div>
							<div className="text-xs mt-1">Здесь фиксируется сквозная телеметрия доставки всех SMS и мессенджеров.</div>
						</div>
					)}
				</main>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			   VIEW 4: ПУЛЬТ БОТОВ (OMNICHANNEL BOT OPERATOR DESK)
			   ═══════════════════════════════════════════════════════════════════ */}
			{logic.activeSection === "bots" && (
				<main className="p-2 pb-24" data-testid="mobile-bots-operator-section">
					<OmnichannelOperatorDesk />
				</main>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			   FULLSCREEN CHAT ROOM (iMessage / Telegram per Apple HIG)
			   ═══════════════════════════════════════════════════════════════════ */}
			{logic.selectedPatientId && logic.activePatient && (
				<FullscreenChatView
					activePatient={logic.activePatient}
					activeChannel={logic.activeChannel}
					isCurrentMobileIntercepted={logic.isCurrentMobileIntercepted}
					onBack={() => logic.setSelectedPatientId(null)}
					onTakeover={logic.handleMobileTakeoverChat}
					chatMessages={logic.chatMessages}
					messagesEndRef={logic.messagesEndRef}
					quickTemplates={logic.quickTemplates}
					onApplyTemplate={logic.handleApplyTemplate}
					inputText={logic.inputText}
					setInputText={logic.setInputText}
					onToggleChannel={logic.handleToggleChannel}
					attachedFileName={logic.attachedFileName}
					onAttachFile={logic.handleAttachFile}
					onRemoveAttachedFile={logic.handleRemoveAttachedFile}
					onSendMessage={logic.handleSendMessage}
					isSendingMessage={logic.isSendingMessage}
					textareaRef={logic.textareaRef}
				/>
			)}
		</div>
	);
};
