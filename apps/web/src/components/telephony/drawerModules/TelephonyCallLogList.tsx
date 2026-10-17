import React, { useMemo, useState } from "react";
import {
	type CallHistoryItem,
	type PatientRecord,
	isUnhandledMissedCall,
} from "../../../store/telephonyStore";
import { TelephonyCallLogEmpty } from "./TelephonyCallLogEmpty";
import { TelephonyCallLogItem } from "./TelephonyCallLogItem";
import type { TelephonyCallLogFilter } from "./telephonyDrawerTypes";

export interface TelephonyCallLogListProps {
	callHistory: CallHistoryItem[];
	activeFilter: TelephonyCallLogFilter;
	patients?: PatientRecord[] | undefined;
	onQuickBookFromLog: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
	onCallbackFromLog: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
	onOpenPatientFromLog?: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
}

export function TelephonyCallLogList({
	callHistory,
	activeFilter,
	patients,
	onQuickBookFromLog,
	onCallbackFromLog,
	onOpenPatientFromLog,
}: TelephonyCallLogListProps): React.JSX.Element {
	const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);

	const filteredItems = useMemo(() => {
		if (activeFilter === "missed_unhandled") {
			return callHistory.filter(isUnhandledMissedCall);
		}
		if (activeFilter === "recorded") {
			return callHistory.filter((c) => Boolean(c.recordingUrl));
		}
		return callHistory;
	}, [callHistory, activeFilter]);

	if (filteredItems.length === 0) {
		return <TelephonyCallLogEmpty activeFilter={activeFilter} />;
	}

	return (
		<div className="space-y-2.5" data-testid="telephony-call-log-list">
			{filteredItems.map((item, idx) => (
				<TelephonyCallLogItem
					key={item.id || item.callId || `${item.phone}-${idx}`}
					item={item}
					idx={idx}
					patients={patients}
					isAudioOpen={expandedAudioId === (item.id || item.callId || `${item.phone}-${idx}`) || idx === 0}
					onToggleAudio={setExpandedAudioId}
					onQuickBook={onQuickBookFromLog}
					onCallback={onCallbackFromLog}
					onOpenPatient={onOpenPatientFromLog}
				/>
			))}
		</div>
	);
}
