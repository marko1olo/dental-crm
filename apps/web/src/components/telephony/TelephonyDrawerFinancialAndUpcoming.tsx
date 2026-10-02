import {
	CalendarCheck,
	Clock,
	Copy,
	CreditCard,
	Send,
	Shield,
} from "lucide-react";
import React from "react";
import type {
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientUpcomingAppointmentSummary,
} from "../../store/telephonyTypes";

export interface TelephonyDrawerFinancialAndUpcomingProps {
	isKnownPatient: boolean;
	financialSummary: PatientFinancialSummary;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	lastVisitSummary: PatientLastVisitSummary | null;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
}

/**
 * Financial status, active insurance, upcoming scheduled appointment, and previous visit info.
 * Mandates 8b (<=800 lines), 8d (zero emojis).
 */
export function TelephonyDrawerFinancialAndUpcoming({
	isKnownPatient,
	financialSummary,
	upcomingAppointment,
	lastVisitSummary,
	onSendWhatsApp,
	onCopySms,
}: TelephonyDrawerFinancialAndUpcomingProps) {
	const hasDms = financialSummary.hasInsurance;
	const hasDebt = financialSummary.hasDebt;

	return (
		<>
			{/* Financial Status Card */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
						<CreditCard size={12} className="text-[var(--teal)]" />
						Финансовый статус:
					</span>
					{hasDms && (
						<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
							<Shield size={10} className="text-sky-500" />
							ДМС активен
						</span>
					)}
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
						<span className="text-[10px] text-[var(--muted)] block">Баланс</span>
						<span
							className={`text-sm font-bold ${
								hasDebt
									? "text-rose-600"
									: financialSummary.balanceRub > 0
										? "text-emerald-600"
										: "text-[var(--ink)]"
							}`}
						>
							{hasDebt
								? `-${financialSummary.formattedDebt}`
								: financialSummary.formattedBalance}
						</span>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
						<span className="text-[10px] text-[var(--muted)] block">Статус договора</span>
						<span className="text-sm font-bold text-[var(--ink)]">
							{isKnownPatient ? "Договор заключен" : "Без договора"}
						</span>
					</div>
				</div>
			</div>

			{/* Upcoming Appointment */}
			{upcomingAppointment && (
				<div className="p-3.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] space-y-2">
					<div className="flex items-center justify-between">
						<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
							<CalendarCheck size={13} />
							Предстоящий приём:
						</span>
						<div className="flex items-center gap-1">
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-white">
								{upcomingAppointment.isToday
									? "Сегодня"
									: upcomingAppointment.isTomorrow
										? "Завтра"
										: upcomingAppointment.formattedDate}
							</span>
							<button
								type="button"
								onClick={onSendWhatsApp}
								className="min-h-[32px] min-w-[32px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
								title="Отправить подтверждение в WhatsApp"
							>
								<Send size={13} />
							</button>
							<button
								type="button"
								onClick={onCopySms}
								className="min-h-[32px] min-w-[32px] rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer shadow-xs"
								title="Скопировать SMS"
							>
								<Copy size={13} />
							</button>
						</div>
					</div>
					<div className="text-xs text-[var(--ink)] space-y-0.5">
						<div className="font-bold">Время: {upcomingAppointment.formattedTime}</div>
						<div className="text-[var(--muted)]">Врач: {upcomingAppointment.doctorName}</div>
					</div>
				</div>
			)}

			{/* Previous Visit Summary */}
			{lastVisitSummary && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1">
					<span className="font-bold text-[10px] uppercase tracking-wider text-[var(--muted)] flex items-center gap-1">
						<Clock size={11} className="text-[var(--teal)]" />
						Предыдущий визит:
					</span>
					<div className="text-xs text-[var(--ink)]">
						<span className="font-semibold">{lastVisitSummary.formattedLastVisit}</span>
						{lastVisitSummary.doctorName && (
							<span className="text-[var(--muted)]"> · Врач: {lastVisitSummary.doctorName}</span>
						)}
					</div>
				</div>
			)}
		</>
	);
}
