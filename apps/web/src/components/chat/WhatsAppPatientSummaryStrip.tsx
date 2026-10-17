import { Calendar, CalendarCheck, CreditCard, Shield } from "lucide-react";

export interface WhatsAppPatientSummaryStripProps {
	upcomingAppointment?: {
		formattedDate: string;
		formattedTime: string;
		doctorName?: string;
	} | null;
	financialSummary: {
		hasDebt?: boolean;
		formattedDebt?: string;
		hasInsurance?: boolean;
	};
}

/**
 * Clinical summary strip: upcoming visit and financial indicators.
 * Strictly adheres to WCAG AAA contrast in light and dark themes.
 */
export function WhatsAppPatientSummaryStrip({
	upcomingAppointment,
	financialSummary,
}: WhatsAppPatientSummaryStripProps) {
	return (
		<div className="px-4 py-2 bg-[var(--paper-soft,rgba(15,23,42,0.6))] border-b border-[var(--line,#334155)] flex flex-wrap items-center justify-between gap-2 text-xs">
			<div className="flex items-center gap-3 flex-wrap">
				{upcomingAppointment ? (
					<div className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-300">
						<CalendarCheck size={14} className="text-teal-600 dark:text-teal-400" />
						<span>
							Приём: {upcomingAppointment.formattedDate} в {upcomingAppointment.formattedTime}
							{upcomingAppointment.doctorName ? ` (${upcomingAppointment.doctorName})` : ""}
						</span>
					</div>
				) : (
					<div className="inline-flex items-center gap-1.5 text-[var(--muted,#94a3b8)]">
						<Calendar size={13} />
						<span>Предстоящих визитов не запланировано</span>
					</div>
				)}
			</div>

			<div className="flex items-center gap-3">
				{financialSummary.hasDebt && (
					<span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800/60 px-2 py-0.5 rounded-md">
						<CreditCard size={11} /> Долг {financialSummary.formattedDebt}
					</span>
				)}
				{financialSummary.hasInsurance && (
					<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 bg-cyan-100 border border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/60 dark:border-cyan-800/60 px-2 py-0.5 rounded-md">
						<Shield size={11} /> ДМС
					</span>
				)}
			</div>
		</div>
	);
}
