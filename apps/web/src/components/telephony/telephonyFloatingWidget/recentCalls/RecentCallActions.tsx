import { Headphones, MessageSquare, Phone, Volume2 } from "lucide-react";
import React from "react";
import { type CallHistoryItem, formatPhoneDisplay } from "../../../../store/telephonyStore";

export interface RecentCallActionsProps {
	item: CallHistoryItem;
	isAudioExpanded: boolean;
	onToggleAudio: () => void;
	onRedial: (phone: string) => void;
	onSendWhatsApp: (phone: string) => void;
}

export function RecentCallActions({
	item,
	isAudioExpanded,
	onToggleAudio,
	onRedial,
	onSendWhatsApp,
}: RecentCallActionsProps): React.JSX.Element {
	const isMissed = item.status === "missed" || item.status === "rejected" || item.actionTaken === "dismissed";

	return (
		<div className="flex items-center gap-1 shrink-0">
			{item.recordingUrl && (
				<button
					type="button"
					onClick={onToggleAudio}
					className={`min-h-[44px] min-w-[44px] p-2.5 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer ${
						isAudioExpanded
							? "bg-[var(--teal,#0d9488)] text-white"
							: "text-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.1))]"
					}`}
					title={isAudioExpanded ? "Скрыть аудиоплеер" : "Прослушать запись разговора"}
					aria-label={`Прослушать запись ${item.phone}`}
					data-testid={`call-history-play-audio-${item.id}`}
				>
					{isAudioExpanded ? <Volume2 size={15} /> : <Headphones size={15} />}
				</button>
			)}

			{isMissed ? (
				<button
					type="button"
					onClick={() => onRedial(item.phone)}
					className="primary-button text-xs font-bold py-1 px-2.5 min-h-[36px] bg-rose-600 hover:bg-rose-700 text-white shrink-0 inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
					title={`Перезвонить пациенту ${formatPhoneDisplay(item.phone)}`}
					aria-label={`Перезвонить ${item.phone}`}
					data-testid={`call-history-redial-${item.id}`}
				>
					<Phone size={13} />
					<span>Перезвонить</span>
				</button>
			) : (
				<button
					type="button"
					onClick={() => onRedial(item.phone)}
					className="icon-button min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--teal)] hover:bg-[var(--teal-surface)] transition-colors inline-flex items-center justify-center cursor-pointer"
					title="Перезвонить"
					aria-label={`Перезвонить ${item.phone}`}
					data-testid={`call-history-redial-${item.id}`}
				>
					<Phone size={14} />
				</button>
			)}

			<button
				type="button"
				onClick={() => onSendWhatsApp(item.phone)}
				className="icon-button min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors inline-flex items-center justify-center cursor-pointer"
				title="Написать в WhatsApp"
				aria-label={`Написать в WhatsApp ${item.phone}`}
				data-testid={`call-history-whatsapp-${item.id}`}
			>
				<MessageSquare size={14} />
			</button>
		</div>
	);
}
