import React from "react";
import {
	Bell, BellOff, Calendar, Check, Clock, Copy, ExternalLink,
	PhoneForwarded, Send, UserCheck, UserPlus, Volume2, VolumeX, Zap,
} from "lucide-react";
import type { CallOutcome, IncomingCallPayload, PatientUpcomingAppointmentSummary } from "../../store/telephonyTypes";
import type { QuickSlotOption, QuickSlotType } from "./IncomingCallQuickBooking";
import type { CallAttribution } from "./telephonyAttribution";

export interface BadgeMenuBookingActionsProps {
	isKnownPatient: boolean;
	callAttribution: CallAttribution | null;
	currentCall: IncomingCallPayload;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	onQuickBook: (slot: QuickSlotType) => void;
	quickSlots?: readonly QuickSlotOption[] | undefined;
	upcomingAppointment: PatientUpcomingAppointmentSummary | { doctorName: string | null; startsAt: string } | null;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	smsCopied: boolean;
	onClose: () => void;
}

export function BadgeMenuBookingActions({
	isKnownPatient, callAttribution, currentCall, isCapturingLead,
	onCaptureLead, onQuickBook, quickSlots, upcomingAppointment,
	onSendWhatsApp, onCopySms, smsCopied, onClose,
}: BadgeMenuBookingActionsProps) {
	const urgentTime = quickSlots?.find((s) => s.type === "today_urgent")?.time || "10:00";
	const tomorrowTime = quickSlots?.find((s) => s.type === "tomorrow")?.time || "11:00";

	return (
		<>
			{!isKnownPatient && callAttribution && (
				<button
					type="button"
					onClick={() => { onCaptureLead(); onClose(); }}
					aria-busy={isCapturingLead}
					className="w-full text-left px-2.5 py-2 rounded-lg bg-[var(--teal-surface)] hover:opacity-90 text-[var(--teal)] font-bold flex items-center gap-2 transition-colors cursor-pointer border border-[var(--teal-soft)] mb-1"
					data-testid="badge-action-capture-lead"
					title={`Захват в лиды с авторазметкой канала (${callAttribution.channelLabel})`}
				>
					<UserPlus size={14} className="text-[var(--teal)] shrink-0" />
					<span className="truncate">
						{currentCall?.isLeadCaptured ? "Лид захвачен" : isCapturingLead ? "Захват лида..." : `В лиды: ${callAttribution.channelLabel}`}
					</span>
				</button>
			)}

			<button
				type="button"
				onClick={() => { onQuickBook("today_urgent"); onClose(); }}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2 transition-colors cursor-pointer"
				data-testid="badge-action-cito"
			>
				<Zap size={13} className="text-amber-500" />
				<span>Запись: Острая боль ({urgentTime})</span>
			</button>

			<button
				type="button"
				onClick={() => { onQuickBook("tomorrow"); onClose(); }}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<Calendar size={13} className="text-[var(--teal)]" />
				<span>Запись на завтра ({tomorrowTime})</span>
			</button>

			{upcomingAppointment && (
				<>
					<button
						type="button"
						onClick={() => { onSendWhatsApp(); onClose(); }}
						className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2 transition-colors cursor-pointer"
					>
						<Send size={13} className="text-emerald-500" />
						<span>Подтвердить визит в WhatsApp</span>
					</button>

					<button
						type="button"
						onClick={() => { onCopySms(); onClose(); }}
						className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
					>
						{smsCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-[var(--muted,#64748b)]" />}
						<span>{smsCopied ? "Текст скопирован" : "Скопировать SMS визита"}</span>
					</button>
				</>
			)}
		</>
	);
}

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
	onRecordOutcome?: ((outcome: CallOutcome) => void) | undefined;
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
					<UserCheck size={13} className="text-emerald-600" /><span>+ Новый пациент</span>
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

export interface IncomingCallBadgeMoreMenuProps {
	isKnownPatient: boolean;
	callAttribution: CallAttribution | null;
	currentCall: IncomingCallPayload;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	onQuickBook: (slot: QuickSlotType) => void;
	quickSlots?: readonly QuickSlotOption[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | { doctorName: string | null; startsAt: string } | null;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	smsCopied: boolean;
	onCopyPhone: () => void;
	isCallAnswered: boolean;
	onToggleTransferPanel: () => void;
	onQuickCreatePatient: () => void;
	isMuted: boolean;
	onToggleMute: () => void;
	isDndActive: boolean;
	onToggleDnd: () => void;
	onToggleOutcomePanel: () => void;
	onOpenFullPatientView: () => void;
	onClose: () => void;
	onRecordOutcome?: ((outcome: CallOutcome) => void) | undefined;
}

export function IncomingCallBadgeMoreMenu(props: IncomingCallBadgeMoreMenuProps) {
	return (
		<div className="absolute right-0 bottom-full mb-1.5 w-64 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line-strong,var(--line,#e2e8f0))] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5">
			<BadgeMenuBookingActions
				isKnownPatient={props.isKnownPatient}
				callAttribution={props.callAttribution}
				currentCall={props.currentCall}
				isCapturingLead={props.isCapturingLead}
				onCaptureLead={props.onCaptureLead}
				onQuickBook={props.onQuickBook}
				quickSlots={props.quickSlots}
				upcomingAppointment={props.upcomingAppointment}
				onSendWhatsApp={props.onSendWhatsApp}
				onCopySms={props.onCopySms}
				smsCopied={props.smsCopied}
				onClose={props.onClose}
			/>
			<BadgeMenuTelephonyActions
				isKnownPatient={props.isKnownPatient}
				isCallAnswered={props.isCallAnswered}
				onCopyPhone={props.onCopyPhone}
				onToggleTransferPanel={props.onToggleTransferPanel}
				onQuickCreatePatient={props.onQuickCreatePatient}
				isMuted={props.isMuted}
				onToggleMute={props.onToggleMute}
				isDndActive={props.isDndActive}
				onToggleDnd={props.onToggleDnd}
				onToggleOutcomePanel={props.onToggleOutcomePanel}
				onOpenFullPatientView={props.onOpenFullPatientView}
				onClose={props.onClose}
				onRecordOutcome={props.onRecordOutcome}
			/>
		</div>
	);
}

export default IncomingCallBadgeMoreMenu;
