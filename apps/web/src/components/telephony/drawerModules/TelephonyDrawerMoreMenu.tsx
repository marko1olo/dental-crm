import { Check, Copy, ExternalLink, PhoneForwarded, Send, UserPlus } from "lucide-react";
import React from "react";
import type { IncomingCallPayload, PatientUpcomingAppointmentSummary } from "../../../store/telephonyTypes";
import type { CallAttribution } from "../telephonyAttribution";
import { showToast } from "../../GlobalToast";

export interface TelephonyDrawerMoreMenuProps {
	isKnownPatient: boolean;
	callAttribution: CallAttribution | null;
	currentCall: IncomingCallPayload | null;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	smsCopied: boolean;
	isCallAnswered: boolean;
	onToggleTransferPanel: () => void;
	onToggleOutcomePanel: () => void;
	onOpenFullPatientView: () => void;
	onClose: () => void;
}

export function TelephonyDrawerMoreMenu({
	isKnownPatient, callAttribution, currentCall, isCapturingLead, onCaptureLead,
	upcomingAppointment, onSendWhatsApp, onCopySms, smsCopied, isCallAnswered,
	onToggleTransferPanel, onToggleOutcomePanel, onOpenFullPatientView, onClose,
}: TelephonyDrawerMoreMenuProps) {
	return (
		<div className="absolute right-0 top-full mt-1 w-60 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5">
			{!isKnownPatient && callAttribution && (
				<button
					type="button"
					onClick={() => { onCaptureLead(); onClose(); }}
					disabled={isCapturingLead || Boolean(currentCall?.isLeadCaptured)}
					className="w-full text-left px-2.5 py-2 rounded-lg bg-[var(--teal-surface)] hover:opacity-90 text-[var(--teal)] font-bold flex items-center gap-2 transition-colors cursor-pointer border border-[var(--teal-soft)] mb-1"
					data-testid="drawer-more-action-capture-lead"
					title={`Захват в лиды с авторазметкой канала (${callAttribution.channelLabel})`}
				>
					{currentCall?.isLeadCaptured ? <Check size={14} className="text-emerald-500 shrink-0" /> : <UserPlus size={14} className="text-[var(--teal)] shrink-0" />}
					<span className="truncate">{currentCall?.isLeadCaptured ? "Лид захвачен" : isCapturingLead ? "Захват лида..." : `В лиды: ${callAttribution.channelLabel}`}</span>
				</button>
			)}
			{upcomingAppointment && (
				<>
					<button type="button" onClick={() => { onSendWhatsApp(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 transition-colors cursor-pointer">
						<Send size={13} className="text-emerald-600" /><span>1-Click WhatsApp</span>
					</button>
					<button type="button" onClick={() => { onCopySms(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
						{smsCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-[var(--muted)]" />}
						<span>{smsCopied ? "SMS скопировано" : "Скопировать SMS"}</span>
					</button>
				</>
			)}
			<button
				type="button"
				onClick={() => {
					if (currentCall?.phone) {
						navigator.clipboard?.writeText(currentCall.phone);
						showToast("Номер телефона скопирован", "info");
					}
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<Copy size={13} className="text-[var(--muted)]" /><span>Копировать номер</span>
			</button>
			{isCallAnswered && (
				<button type="button" onClick={() => { onToggleTransferPanel(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
					<PhoneForwarded size={13} className="text-[var(--teal)]" /><span>Перевод на врача</span>
				</button>
			)}
			<button type="button" onClick={() => { onToggleOutcomePanel(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
				<Check size={13} className="text-[var(--teal)]" /><span>Фиксация исхода</span>
			</button>
			<div className="my-1 border-t border-[var(--line)]" />
			<button type="button" onClick={() => { onOpenFullPatientView(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--teal)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
				<ExternalLink size={13} /><span>Открыть в общем списке</span>
			</button>
		</div>
	);
}
