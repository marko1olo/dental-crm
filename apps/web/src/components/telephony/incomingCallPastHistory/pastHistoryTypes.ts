import type { CallOutcome, SpeechTranscriptUtterance } from "../../../store/telephonyStore";

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
