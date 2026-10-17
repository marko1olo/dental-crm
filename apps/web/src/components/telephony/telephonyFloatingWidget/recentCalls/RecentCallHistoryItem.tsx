import { PhoneIncoming, PhoneMissed, PhoneOff } from "lucide-react";
import React from "react";
import {
	CALL_OUTCOME_REGISTRY,
	type CallHistoryItem,
	formatDurationTimer,
	formatPhoneDisplay,
} from "../../../../store/telephonyStore";
import { CallAudioPlayer } from "../../CallAudioPlayer";
import { RecentCallActions } from "./RecentCallActions";
import { resolveCallerDisplayName } from "./filterRecentCalls";

export interface RecentCallHistoryItemProps {
	item: CallHistoryItem;
	isAudioExpanded: boolean;
	onToggleAudio: () => void;
	onRedial: (phone: string) => void;
	onSendWhatsApp: (phone: string) => void;
}

export function RecentCallHistoryItem({
	item,
	isAudioExpanded,
	onToggleAudio,
	onRedial,
	onSendWhatsApp,
}: RecentCallHistoryItemProps): React.JSX.Element {
	const isConnected = item.status === "answered" || item.status === "connected";
	const isRejected = item.status === "rejected";
	const isMissed = item.status === "missed" || isRejected || item.actionTaken === "dismissed";
	const outcomeCfg = item.outcome ? CALL_OUTCOME_REGISTRY[item.outcome] : item.actionTaken ? CALL_OUTCOME_REGISTRY[item.actionTaken] : undefined;
	const resolvedName = resolveCallerDisplayName(item.phone, item.patientName);
	const iconBg = isConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : isRejected ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400";

	return (
		<div
			className="flex flex-col gap-2 p-2.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] text-xs shadow-xs"
			data-testid={`telephony-history-item-${item.id}`}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2.5 min-w-0 flex-1">
					<div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
						{isConnected ? <PhoneIncoming size={14} /> : isRejected ? <PhoneOff size={14} /> : <PhoneMissed size={14} />}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="font-bold text-[var(--ink,#0f172a)] truncate leading-snug" title={resolvedName}>
								{resolvedName}
							</span>
							{isMissed && (
								<span
									className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1 shadow-xs shrink-0"
									data-testid={`call-history-requires-callback-${item.id}`}
									title="Пропущенный вызов — требуется перезвонить пациенту"
								>
									<PhoneMissed size={10} className="text-rose-600 dark:text-rose-400" />
									<span>Требует перезвона</span>
								</span>
							)}
							{outcomeCfg && (
								<span
									className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
									style={{ backgroundColor: outcomeCfg.badgeBg, color: outcomeCfg.color, border: `1px solid ${outcomeCfg.badgeBorder}` }}
								>
									{outcomeCfg.shortLabel}
								</span>
							)}
						</div>
						<div className="text-[10px] font-mono text-[var(--muted,#64748b)] flex items-center gap-1.5 min-w-0 mt-0.5">
							<span className="truncate">{formatPhoneDisplay(item.phone)}</span>
							{item.timestamp && (
								<span className="shrink-0">
									· {new Date(item.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
								</span>
							)}
							{typeof item.durationSeconds === "number" && item.durationSeconds > 0 && (
								<span className="shrink-0 text-[var(--ink,#0f172a)] font-semibold">
									· {formatDurationTimer(item.durationSeconds)}
								</span>
							)}
						</div>
					</div>
				</div>

				<RecentCallActions
					item={item}
					isAudioExpanded={isAudioExpanded}
					onToggleAudio={onToggleAudio}
					onRedial={onRedial}
					onSendWhatsApp={onSendWhatsApp}
				/>
			</div>

			{item.recordingUrl && isAudioExpanded && (
				<div className="pt-1 border-t border-[var(--line,#e2e8f0)]" data-testid={`call-history-audio-player-${item.id}`}>
					<CallAudioPlayer
						recordingUrl={item.recordingUrl}
						durationSeconds={item.durationSeconds || 0}
						seed={item.id}
						transcript={item.transcript}
					/>
				</div>
			)}
		</div>
	);
}
