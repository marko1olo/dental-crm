import React from "react";
import { FileText } from "lucide-react";
import { CommunicationEventRow } from "../CommunicationEventRow";
import type { MobileCommunicationsMessengerProps } from "./types";

export interface MobileJournalSectionProps {
	events: any[];
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

export const MobileJournalSection: React.FC<MobileJournalSectionProps> = ({ events, props }) => {
	const {
		communicationChannelLabels = defaultChannelLabels,
		communicationStatusLabels = { pending: "Ожидает", in_progress: "В работе", completed: "Завершено", cancelled: "Отменено" },
		formatDateTime = (val: string) => new Date(val).toLocaleString("ru-RU"),
	} = props;

	return (
		<main className="mobile-dialogs-container pt-3">
			{events.length > 0 ? (
				<div className="mobile-dialogs-card">
					{events.map((ev: any) => (
						<CommunicationEventRow
							key={ev.id} event={ev} communicationChannelLabels={communicationChannelLabels}
							communicationStatusLabels={communicationStatusLabels} formatDateTime={formatDateTime}
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
	);
};
