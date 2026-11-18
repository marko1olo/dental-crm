import { ChevronDown, History, PhoneForwarded } from "lucide-react";
import React from "react";
import { CallAudioPlayer } from "./CallAudioPlayer";
import type { CallOutcome, SpeechTranscriptUtterance } from "../../store/telephonyStore";

export interface TransferExtension {
	ext: string;
	label: string;
}

export const DEFAULT_TRANSFER_EXTENSIONS: TransferExtension[] = [
	{ ext: "101", label: "Кабинет 1 (Терапия)" },
	{ ext: "102", label: "Кабинет 2 (Хирургия)" },
	{ ext: "103", label: "Кабинет 3 (Ортопедия)" },
	{ ext: "104", label: "Ресепшн / Администратор" },
];

/**
 * Динамический резолвер внутренних линий клиники (Мандат DEF-TEL-05).
 * Привязывает добавочные номера к реальным кабинетам и врачам активной смены.
 */
export function resolveActiveClinicExtensions(custom?: TransferExtension[]): TransferExtension[] {
	if (custom && custom.length > 0) return custom;
	try {
		if (typeof window !== "undefined") {
			const rawShift = localStorage.getItem("dente_active_shift");
			if (rawShift) {
				const shift = JSON.parse(rawShift);
				if (Array.isArray(shift.activeDoctors) && shift.activeDoctors.length > 0) {
					return shift.activeDoctors.map((doc: { ext?: string; name?: string; cabinet?: string }, idx: number) => ({
						ext: doc.ext || String(101 + idx),
						label: doc.cabinet ? `${doc.ext || String(101 + idx)} Каб. ${doc.cabinet}` : `${doc.ext || String(101 + idx)} ${doc.name || "Врач"}`,
					}));
				}
			}
		}
	} catch {}

	return DEFAULT_TRANSFER_EXTENSIONS;
}

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

export interface IncomingCallTransferPanelProps {
	showTransferPanel: boolean;
	onToggleTransferPanel: () => void;
	transferType: "blind" | "attended";
	onSelectTransferType: (t: "blind" | "attended") => void;
	onStartTransfer: (ext: string, type: "blind" | "attended") => void;
	extensions?: TransferExtension[];
}

export function IncomingCallTransferPanel({
	showTransferPanel,
	onToggleTransferPanel,
	transferType,
	onSelectTransferType,
	onStartTransfer,
	extensions,
}: IncomingCallTransferPanelProps) {
	const activeExtensions = resolveActiveClinicExtensions(extensions);

	return (
		<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-2">
			<button
				type="button"
				onClick={onToggleTransferPanel}
				className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between cursor-pointer"
			>
				<div className="flex items-center gap-2">
					<PhoneForwarded size={15} className="text-[var(--teal)]" />
					<span>{showTransferPanel ? "Скрыть перевод" : "Перевод на врача"}</span>
				</div>
				<ChevronDown size={16} className={`transition-transform duration-200 ${showTransferPanel ? "rotate-180" : ""}`} />
			</button>

			{showTransferPanel && (
				<div className="space-y-2 pt-1 animate-fade-in">
					<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-lg p-1 border border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => onSelectTransferType("blind")}
							className={`flex-1 min-h-[40px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
								transferType === "blind" ? "bg-[var(--teal)] text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Прямой перевод
						</button>
						<button
							type="button"
							onClick={() => onSelectTransferType("attended")}
							className={`flex-1 min-h-[40px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
								transferType === "attended" ? "bg-[var(--teal)] text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							С консультацией
						</button>
					</div>

					<div className="grid grid-cols-4 gap-1.5">
						{activeExtensions.map((item) => (
							<button
								key={item.ext}
								type="button"
								onClick={() => onStartTransfer(item.ext, transferType)}
								className="min-h-[40px] p-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] font-bold text-xs text-[var(--ink,#0f172a)] text-center transition-all cursor-pointer truncate"
								title={`Перевести вызов на ${item.label}`}
							>
								<div className="font-mono text-xs font-bold leading-tight">{item.ext}</div>
								<div className="text-[10px] text-[var(--muted,#64748b)] truncate font-normal leading-tight mt-0.5">
									{item.label.replace(/^\d+\s*/, "")}
								</div>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export interface IncomingCallOutcomePanelProps {
	showOutcomePanel: boolean;
	onToggleOutcomePanel: () => void;
	onRecordOutcome: (outcome: CallOutcome) => void;
	outcomes?: OutcomeOption[];
}

export function IncomingCallOutcomePanel({
	showOutcomePanel,
	onToggleOutcomePanel,
	onRecordOutcome,
	outcomes = DEFAULT_CALL_OUTCOMES,
}: IncomingCallOutcomePanelProps) {
	return (
		<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] overflow-hidden">
			<button
				type="button"
				onClick={onToggleOutcomePanel}
				className="w-full min-h-[40px] px-3 py-2 flex items-center justify-between text-[11px] font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
			>
				<span className="font-semibold text-xs flex items-center gap-1.5">
					<History size={13} className="text-[var(--teal)]" />
					Фиксация исхода звонка
				</span>
				<ChevronDown size={14} className={`transition-transform duration-200 ${showOutcomePanel ? "rotate-180" : ""}`} />
			</button>
			{showOutcomePanel && (
				<div className="p-2.5 pt-0 grid grid-cols-2 gap-1.5 animate-in fade-in">
					{outcomes.map((item) => (
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
	);
}

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

export default IncomingCallPastHistory;
