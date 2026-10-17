import React from "react";
import {
	type CallHistoryItem,
	type PatientRecord,
	resolvePatientFromPhone,
} from "../../../store/telephonyStore";
import { CallAudioPlayer } from "../CallAudioPlayer";
import { TelephonyCallLogItemActions } from "./TelephonyCallLogItemActions";
import { TelephonyCallLogItemHeader } from "./TelephonyCallLogItemHeader";
import { resolveCallKind, resolveCallbackSlaStatus } from "./telephonyDrawerTypes";

export interface TelephonyCallLogItemProps {
	item: CallHistoryItem;
	idx: number;
	patients?: PatientRecord[] | undefined;
	isAudioOpen: boolean;
	onToggleAudio: (key: string) => void;
	onQuickBook: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
	onCallback: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
	onOpenPatient?: ((item: CallHistoryItem, matchedPatient: PatientRecord | null) => void) | undefined;
}

export function TelephonyCallLogItem({
	item,
	idx,
	patients,
	isAudioOpen,
	onToggleAudio,
	onQuickBook,
	onCallback,
	onOpenPatient,
}: TelephonyCallLogItemProps): React.JSX.Element {
	const matchedPatient =
		(item.patientId && patients?.find((p) => p.id === item.patientId)) ||
		resolvePatientFromPhone(patients, item.phone) ||
		null;
	const displayName =
		matchedPatient?.fullName ||
		(item.patientName && item.patientName !== "Неизвестный номер"
			? item.patientName
			: "Неизвестный абонент");
	const isKnown = Boolean(matchedPatient || (item.patientId && item.patientName !== "Неизвестный номер"));
	const kind = resolveCallKind(item);
	const sla = resolveCallbackSlaStatus(item);
	const itemKey = item.id || item.callId || `${item.phone}-${idx}`;
	const timeStr = item.callStartedAt
		? new Date(item.callStartedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
		: "Сейчас";

	return (
		<article
			className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5 transition-colors"
			data-testid="telephony-call-log-item"
		>
			<TelephonyCallLogItemHeader
				kind={kind}
				sla={sla}
				displayName={displayName}
				isKnown={isKnown}
				phone={item.phone}
				timeStr={timeStr}
				durationSeconds={item.durationSeconds}
				onOpenPatient={() => onOpenPatient?.(item, matchedPatient)}
			/>

			{item.outcomeNote && (
				<div className="text-[11px] text-[var(--muted)] bg-[var(--paper-strong)] px-2.5 py-1.5 rounded-lg border border-[var(--line)]">
					{item.outcomeNote}
				</div>
			)}

			{item.recordingUrl && isAudioOpen && (
				<div className="pt-1" data-testid="call-log-audio-player-container">
					<CallAudioPlayer
						recordingUrl={item.recordingUrl}
						durationSeconds={item.durationSeconds || 42}
						seed={itemKey}
						transcript={item.transcript}
					/>
				</div>
			)}

			<TelephonyCallLogItemActions
				item={item}
				itemKey={itemKey}
				matchedPatient={matchedPatient}
				isKnown={isKnown}
				kind={kind}
				isAudioOpen={isAudioOpen}
				onToggleAudio={onToggleAudio}
				onQuickBook={onQuickBook}
				onCallback={onCallback}
				onOpenPatient={onOpenPatient}
			/>
		</article>
	);
}
