import React from "react";
import { CheckCheck } from "lucide-react";
import { CommunicationTaskCard } from "../CommunicationTaskCard";
import type { MobileCommunicationsMessengerProps } from "./types";

export interface MobileTasksSectionProps {
	tasks: any[];
	props: MobileCommunicationsMessengerProps;
}

const defaultChannelLabels = {
	phone: "Телефон",
	email: "Email",
	sms: "SMS",
	whatsapp: "WhatsApp",
	telegram: "Telegram",
	in_person: "Лично",
	vk: "ВКонтакте",
	max: "MAX",
};

export const MobileTasksSection: React.FC<MobileTasksSectionProps> = ({ tasks, props }) => {
	const {
		dashboard, completeCommunicationTask, communicationSavingTaskId = null,
		openCommunicationTaskDocumentWorkflow, communicationChannelLabels = defaultChannelLabels,
		communicationPriorityLabels = { urgent: "Срочно", normal: "Обычный", low: "Низкий" },
		communicationIntentLabels,
		communicationStatusLabels = { pending: "Ожидает", in_progress: "В работе", completed: "Завершено", cancelled: "Отменено" },
		documentKindsForCommunicationTask = () => [], documentLabels = {}, staffRoleLabels = {},
		formatDateTime = (val: string) => new Date(val).toLocaleString("ru-RU"),
	} = props;

	return (
		<main className="mobile-dialogs-container pt-3">
			{tasks.length > 0 ? (
				<div className="flex flex-col gap-3">
					{tasks.map((task: any) => (
						<CommunicationTaskCard
							key={task.id} task={task} communicationChannelLabels={communicationChannelLabels}
							communicationDocumentTaskActionLabels={{}}
							communicationIntentLabels={
								(communicationIntentLabels as any) || {
									general: "Связь", appointment_confirmation: "Подтверждение записи",
									callback_requested: "Перезвонить", payment_reminder: "Напоминание об оплате",
									post_visit_instruction: "После приёма", recall: "Профосмотр",
									document_ready: "Документы готовы", imaging_review: "Контроль снимка",
									lead_capture: "Обращение", transactional_reply: "Ответ",
								}
							}
							communicationPriorityLabels={communicationPriorityLabels}
							communicationSavingTaskId={communicationSavingTaskId}
							communicationStatusLabels={communicationStatusLabels}
							completionNoteDescriptionId="mobile-comm-note-desc"
							completeCommunicationTask={completeCommunicationTask || (() => {})}
							documentKinds={documentKindsForCommunicationTask(task)}
							documentLabels={documentLabels} formatDateTime={formatDateTime}
							openCommunicationTaskDocumentWorkflow={openCommunicationTaskDocumentWorkflow || (() => {})}
							staffRoleLabels={staffRoleLabels} appointments={dashboard.appointments}
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
	);
};
