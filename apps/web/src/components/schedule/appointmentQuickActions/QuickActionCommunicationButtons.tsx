import { CheckCircle2, Clock, Copy, MessageSquare } from "lucide-react";
import React from "react";
import type { AppointmentMessageType } from "../generateAppointmentWhatsAppMessage";

export interface QuickActionCommunicationButtonsProps {
	patientName: string;
	compact: boolean;
	showLabels: boolean;
	onSendWhatsApp: (
		messageType: AppointmentMessageType,
		shiftedMinutes?: number,
	) => void;
	onCopySmsReminder: (messageType: AppointmentMessageType) => void;
}

export function QuickActionCommunicationButtons({
	patientName,
	compact,
	showLabels,
	onSendWhatsApp,
	onCopySmsReminder,
}: QuickActionCommunicationButtonsProps) {
	return (
		<div
			className="flex items-center gap-1 shrink-0 flex-wrap"
			data-testid="appointment-communication-actions"
		>
			<button
				type="button"
				disabled={false}
				onClick={(e) => {
					e.stopPropagation();
					onSendWhatsApp("reminder_24h");
				}}
				className="quick-action-pill min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none select-none touch-manipulation active:scale-95 shadow-2xs"
				title={`Отправить напоминание за 24ч с памяткой в WhatsApp (${patientName})`}
				aria-label={`WhatsApp напоминание: ${patientName}`}
				data-testid="appointment-action-wa-reminder"
			>
				<MessageSquare
					size={13}
					className="shrink-0 text-emerald-600 dark:text-emerald-400"
				/>
				{showLabels && (
					<span className="break-words leading-none text-center">
						{compact ? "WA" : "WA: 24ч"}
					</span>
				)}
			</button>

			<button
				type="button"
				disabled={false}
				onClick={(e) => {
					e.stopPropagation();
					onCopySmsReminder("reminder_24h");
				}}
				className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] text-[var(--ink)] text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 shadow-2xs"
				title={`Скопировать текст напоминания (SMS/мессенджер) для ${patientName}`}
				aria-label={`Скопировать SMS: ${patientName}`}
				data-testid="appointment-action-copy-sms"
			>
				<Copy
					size={13}
					className="shrink-0 text-[var(--teal,var(--brand-primary))]"
				/>
				<span>SMS</span>
			</button>

			<button
				type="button"
				disabled={false}
				onClick={(e) => {
					e.stopPropagation();
					onSendWhatsApp("confirmation");
				}}
				className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 shadow-2xs"
				title={`Отправить подтверждение визита в WhatsApp (${patientName})`}
				aria-label={`WhatsApp подтверждение: ${patientName}`}
				data-testid="appointment-action-wa-confirm"
			>
				<CheckCircle2 size={13} className="shrink-0 text-violet-500" />
				<span className="hidden sm:inline">Подтвердить</span>
			</button>

			<button
				type="button"
				disabled={false}
				onClick={(e) => {
					e.stopPropagation();
					onSendWhatsApp("time_shift", 15);
				}}
				className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 shadow-2xs"
				title={`Отправить уведомление о переносе времени (+15 мин) в WhatsApp (${patientName})`}
				aria-label={`WhatsApp перенос: ${patientName}`}
				data-testid="appointment-action-wa-shift"
			>
				<Clock size={13} className="shrink-0 text-amber-500" />
				<span className="hidden sm:inline">Перенос</span>
			</button>
		</div>
	);
}
