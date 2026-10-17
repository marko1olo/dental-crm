import { Calendar, Check, Copy, Send, UserPlus, Zap } from "lucide-react";
import React from "react";
import type { IncomingCallPayload, PatientUpcomingAppointmentSummary } from "../../../store/telephonyTypes";
import type { QuickSlotOption, QuickSlotType } from "../IncomingCallQuickBooking";
import type { CallAttribution } from "../telephonyAttribution";

export interface BadgeMenuBookingActionsProps {
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
					disabled={isCapturingLead || currentCall?.isLeadCaptured}
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
				<span>Запись: Завтра ({tomorrowTime})</span>
			</button>

			{upcomingAppointment && (
				<>
					<button
						type="button"
						onClick={() => { onSendWhatsApp(); onClose(); }}
						className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 transition-colors cursor-pointer"
					>
						<Send size={13} className="text-emerald-600" />
						<span>1-Click WhatsApp</span>
					</button>

					<button
						type="button"
						onClick={() => { onCopySms(); onClose(); }}
						className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
					>
						{smsCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-[var(--muted,#64748b)]" />}
						<span>{smsCopied ? "SMS скопировано" : "Скопировать SMS"}</span>
					</button>
				</>
			)}
		</>
	);
}
