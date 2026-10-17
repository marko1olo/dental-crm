import React from "react";
import { CallAudioPlayer } from "./CallAudioPlayer";
import { IncomingCallTransferPanel } from "./incomingCallPastHistory/IncomingCallTransferPanel";
import { IncomingCallOutcomePanel } from "./incomingCallPastHistory/IncomingCallOutcomePanel";
import type { IncomingCallPastHistoryProps } from "./incomingCallPastHistory/pastHistoryTypes";

export * from "./incomingCallPastHistory/pastHistoryTypes";
export { IncomingCallTransferPanel } from "./incomingCallPastHistory/IncomingCallTransferPanel";
export { IncomingCallOutcomePanel } from "./incomingCallPastHistory/IncomingCallOutcomePanel";

/**
 * Call Lifecycle History, SIP Transfer Panel and Call Outcome Logging.
 * Eliminates procedural sound generators, complies with zero-emoji standard.
 */
export function IncomingCallPastHistory({
	isCallAnswered,
	showTransferPanel,
	onToggleTransferPanel,
	transferType,
	onSelectTransferType,
	onStartTransfer,
	showOutcomePanel,
	onToggleOutcomePanel,
	onRecordOutcome,
	recordingUrl,
	durationSeconds,
	seed,
	transcript,
	className = "",
}: IncomingCallPastHistoryProps) {
	return (
		<div className={`space-y-3.5 text-xs ${className}`}>
			{isCallAnswered && (
				<IncomingCallTransferPanel
					showTransferPanel={showTransferPanel}
					onToggleTransferPanel={onToggleTransferPanel}
					transferType={transferType}
					onSelectTransferType={onSelectTransferType}
					onStartTransfer={onStartTransfer}
				/>
			)}

			{recordingUrl && (
				<CallAudioPlayer
					recordingUrl={recordingUrl}
					durationSeconds={durationSeconds || 0}
					seed={seed}
					transcript={transcript}
				/>
			)}

			<IncomingCallOutcomePanel
				showOutcomePanel={showOutcomePanel}
				onToggleOutcomePanel={onToggleOutcomePanel}
				onRecordOutcome={onRecordOutcome}
			/>
		</div>
	);
}
