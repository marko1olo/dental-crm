import {
	Check,
	ChevronDown,
	History,
	PhoneForwarded,
} from "lucide-react";
import React from "react";
import type {
	CallOutcome,
	SpeechTranscriptUtterance,
} from "../../store/telephonyStore";
import { CallAudioPlayer } from "./CallAudioPlayer";

export interface TransferExtension {
	ext: string;
	label: string;
}

export const DEFAULT_TRANSFER_EXTENSIONS: TransferExtension[] = [
	{ ext: "101", label: "101 Терапевт" },
	{ ext: "102", label: "102 Хирург" },
	{ ext: "103", label: "103 Ортопед" },
	{ ext: "104", label: "104 Ресепшн" },
];

export interface OutcomeOption {
	action: CallOutcome;
	label: string;
}

export const DEFAULT_CALL_OUTCOMES: OutcomeOption[] = [
	{ action: "booked", label: "Записан на приём" },
	{ action: "callback_15m", label: "Перезвонить 15м" },
	{ action: "consultation", label: "Консультация" },
	{ action: "spam", label: "Спам / Ошибка" },
];

export interface IncomingCallPastHistoryProps {
	isCallAnswered: boolean;
	showTransferPanel: boolean;
	onToggleTransferPanel: () => void;
	transferType: "blind" | "attended";
	onSelectTransferType: (t: "blind" | "attended") => void;
	onStartTransfer: (ext: string, type: "blind" | "attended") => void;
	showOutcomePanel: boolean;
	onToggleOutcomePanel: () => void;
	onRecordOutcome: (outcome: CallOutcome) => void;
	recordingUrl?: string | undefined;
	durationSeconds?: number | undefined;
	seed?: string | undefined;
	transcript?: SpeechTranscriptUtterance[] | undefined;
	className?: string | undefined;
}

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
			{/* WebRTC SIP Call Transfer Panel (when call is answered) */}
			{isCallAnswered && (
				<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-2">
					<button
						type="button"
						onClick={onToggleTransferPanel}
						className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between cursor-pointer"
					>
						<div className="flex items-center gap-2">
							<PhoneForwarded size={15} className="text-[var(--teal)]" />
							<span>
								{showTransferPanel
									? "Скрыть перевод"
									: "Перевод на врача"}
							</span>
						</div>
						<ChevronDown
							size={16}
							className={`transition-transform duration-200 ${showTransferPanel ? "rotate-180" : ""}`}
						/>
					</button>

					{showTransferPanel && (
						<div className="space-y-2 pt-1 animate-fade-in">
							<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-lg p-1 border border-[var(--line,#e2e8f0)]">
								<button
									type="button"
									onClick={() => onSelectTransferType("blind")}
									className={`flex-1 min-h-[40px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
										transferType === "blind"
											? "bg-[var(--teal)] text-white"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									Прямой перевод
								</button>
								<button
									type="button"
									onClick={() => onSelectTransferType("attended")}
									className={`flex-1 min-h-[40px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
										transferType === "attended"
											? "bg-[var(--teal)] text-white"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									С консультацией
								</button>
							</div>

							<div className="grid grid-cols-4 gap-1.5">
								{DEFAULT_TRANSFER_EXTENSIONS.map((item) => (
									<button
										key={item.ext}
										type="button"
										onClick={() => onStartTransfer(item.ext, transferType)}
										className="min-h-[44px] px-1 py-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[10px] font-bold text-center flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs"
									>
										<span className="font-mono text-[var(--teal)]">
											{item.ext}
										</span>
										<span className="text-[9px] font-normal text-[var(--muted,#64748b)] truncate w-full">
											{item.label.split(" ")[1]}
										</span>
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Audio Recording Player */}
			{recordingUrl && (
				<CallAudioPlayer
					recordingUrl={recordingUrl}
					durationSeconds={durationSeconds || 0}
					seed={seed}
					transcript={transcript}
				/>
			)}

			{/* Call Outcome Logging (Collapsible Section) */}
			<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] overflow-hidden">
				<button
					type="button"
					onClick={onToggleOutcomePanel}
					className="w-full min-h-[40px] px-3 py-2 flex items-center justify-between text-[11px] font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
				>
					<span className="uppercase tracking-wider flex items-center gap-1.5">
						<History size={13} className="text-[var(--teal)]" />
						Фиксация исхода звонка
					</span>
					<ChevronDown
						size={14}
						className={`transition-transform duration-200 ${showOutcomePanel ? "rotate-180" : ""}`}
					/>
				</button>
				{showOutcomePanel && (
					<div className="p-2.5 pt-0 grid grid-cols-2 gap-1.5 animate-in fade-in">
						{DEFAULT_CALL_OUTCOMES.map((item) => (
							<button
								key={item.action}
								type="button"
								onClick={() => onRecordOutcome(item.action)}
								className="min-h-[40px] px-2 py-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] text-center transition-all cursor-pointer"
							>
								{item.label}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
