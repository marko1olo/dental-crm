import { Bell, BellOff, Check, Clock, Copy, ExternalLink, PhoneForwarded, UserCheck, Volume2, VolumeX } from "lucide-react";
import React from "react";
import type { CallOutcome } from "../../../store/telephonyTypes";

export interface BadgeMenuTelephonyActionsProps {
	isKnownPatient: boolean;
	isCallAnswered: boolean;
	onCopyPhone: () => void;
	onToggleTransferPanel: () => void;
	onQuickCreatePatient: () => void;
	isMuted: boolean;
	onToggleMute: () => void;
	isDndActive: boolean;
	onToggleDnd: () => void;
	onToggleOutcomePanel: () => void;
	onOpenFullPatientView: () => void;
	onClose: () => void;
	onRecordOutcome?: (outcome: CallOutcome) => void;
}

export function BadgeMenuTelephonyActions({
	isKnownPatient, isCallAnswered, onCopyPhone, onToggleTransferPanel,
	onQuickCreatePatient, isMuted, onToggleMute, isDndActive, onToggleDnd,
	onToggleOutcomePanel, onOpenFullPatientView, onClose, onRecordOutcome,
}: BadgeMenuTelephonyActionsProps) {
	return (
		<>
			<button type="button" onClick={() => { onCopyPhone(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
				<Copy size={13} className="text-[var(--muted,#64748b)]" /><span>Копировать номер</span>
			</button>

			{isCallAnswered && (
				<button type="button" onClick={() => { onToggleTransferPanel(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
					<PhoneForwarded size={13} className="text-[var(--teal)]" /><span>Перевод на врача</span>
				</button>
			)}

			{!isKnownPatient && (
				<button type="button" onClick={() => { onQuickCreatePatient(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 transition-colors cursor-pointer">
					<UserCheck size={13} className="text-emerald-600" /><span>+ Новый пациент (1-Click)</span>
				</button>
			)}

			<button type="button" onClick={() => { onToggleMute(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
				{isMuted ? <Volume2 size={13} className="text-[var(--teal)]" /> : <VolumeX size={13} className="text-rose-500" />}
				<span>{isMuted ? "Включить звук звонка" : "Заглушить звук звонка"}</span>
			</button>

			<button type="button" onClick={() => { onToggleDnd(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
				{isDndActive ? <Bell size={13} className="text-[var(--teal)]" /> : <BellOff size={13} className="text-rose-500" />}
				<span>{isDndActive ? "Выключить режим DND" : "Включить «Не беспокоить» (DND)"}</span>
			</button>

			<button type="button" onClick={() => { onToggleOutcomePanel(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
				<Check size={13} className="text-[var(--teal)]" /><span>Фиксация исхода</span>
			</button>

			{onRecordOutcome && (
				<button
					type="button"
					onClick={() => { onRecordOutcome("callback_15m"); onClose(); }}
					className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2 transition-colors cursor-pointer"
					data-testid="badge-action-callback-15m"
					title="Перезвонить через 15 минут (быстрая фиксация)"
				>
					<Clock size={13} className="text-amber-500" /><span>Перезвонить через 15 мин</span>
				</button>
			)}

			<div className="my-1 border-t border-[var(--line,#e2e8f0)]" />

			<button type="button" onClick={() => { onOpenFullPatientView(); onClose(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--teal)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
				<ExternalLink size={13} /><span>Открыть в общем списке</span>
			</button>
		</>
	);
}
