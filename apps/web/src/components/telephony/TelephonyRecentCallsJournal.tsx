import React from "react";
import type { CallHistoryItem, IncomingCallPayload } from "../../store/telephonyTypes";
import { TelephonyRecentCallsList } from "./telephonyFloatingWidget/TelephonyRecentCallsList";

export interface TelephonyRecentCallsJournalProps {
	callHistory: IncomingCallPayload[];
	onRedial: (phone: string) => void;
	onSendWhatsApp: (phone: string) => void;
}

export function TelephonyRecentCallsJournal({
	callHistory,
	onRedial,
	onSendWhatsApp,
}: TelephonyRecentCallsJournalProps) {
	return (
		<TelephonyRecentCallsList
			callHistory={callHistory as CallHistoryItem[]}
			onRedial={onRedial}
			onSendWhatsApp={onSendWhatsApp}
		/>
	);
}
