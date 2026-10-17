import { CalendarCheck, Headphones, PhoneOutgoing, UserCheck } from "lucide-react";
import React from "react";
import type { CallHistoryItem, PatientRecord } from "../../../store/telephonyStore";

export interface TelephonyCallLogItemActionsProps {
	item: CallHistoryItem;
	itemKey: string;
	matchedPatient: PatientRecord | null;
	isKnown: boolean;
	kind: "incoming" | "outgoing" | "missed";
	isAudioOpen: boolean;
	onToggleAudio: (key: string) => void;
	onQuickBook: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
	onCallback: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
	onOpenPatient?: ((item: CallHistoryItem, matchedPatient: PatientRecord | null) => void) | undefined;
}

export function TelephonyCallLogItemActions({
	item,
	itemKey,
	matchedPatient,
	isKnown,
	kind,
	isAudioOpen,
	onToggleAudio,
	onQuickBook,
	onCallback,
	onOpenPatient,
}: TelephonyCallLogItemActionsProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-2 pt-0.5">
			<button
				type="button"
				onClick={() => onQuickBook(item, matchedPatient)}
				className="dnt-telephony-primary-btn flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
				data-testid="call-log-quick-book-btn"
				title="Быстрая запись на приём в 1 клик"
			>
				<CalendarCheck size={13} />
				<span>Записать в 1 клик</span>
			</button>

			{item.recordingUrl && !isAudioOpen ? (
				<button
					type="button"
					onClick={() => onToggleAudio(itemKey)}
					className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
					data-testid="call-log-toggle-audio-btn"
				>
					<Headphones size={13} className="text-[var(--teal)]" />
					<span>Прослушать запись</span>
				</button>
			) : kind === "missed" ? (
				<button
					type="button"
					onClick={() => onCallback(item, matchedPatient)}
					className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
					data-testid="call-log-callback-btn"
				>
					<PhoneOutgoing size={13} className="text-[var(--teal)]" />
					<span>Перезвонить</span>
				</button>
			) : (
				<button
					type="button"
					onClick={() =>
						onOpenPatient
							? onOpenPatient(item, matchedPatient)
							: onCallback(item, matchedPatient)
					}
					className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
					data-testid="call-log-open-patient-btn"
				>
					<UserCheck size={13} className="text-[var(--teal)]" />
					<span>{isKnown ? "Открыть карту" : "Перезвонить"}</span>
				</button>
			)}
		</div>
	);
}
