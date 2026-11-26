import { CalendarCheck, Check, Clock, Copy, CreditCard, Send, Shield } from "lucide-react";
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
	onConfirmAppointment?: (() => void) | undefined;
	isConfirmingAppointment?: boolean | undefined;
	isAppointmentConfirmed?: boolean | undefined;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
}

export function TelephonyDrawerFinancialAndUpcoming({
	isKnownPatient,
	financialSummary,
	upcomingAppointment,
	lastVisitSummary,
	onConfirmAppointment,
	isConfirmingAppointment = false,
	isAppointmentConfirmed = false,
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
					<span className="font-semibold text-xs text-[var(--muted)] flex items-center gap-1.5">
						<CreditCard size={12} className="text-[var(--primary)]" />Финансовый статус:
					</span>
					{hasDms && (
						<span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
							<Shield size={10} className="text-sky-500" />ДМС активен
						</span>
					)}
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
						<span className="text-[10px] text-[var(--muted)] block">Баланс</span>
						<span className={`text-sm font-mono tracking-tight font-medium ${hasDebt ? "text-[var(--danger)]" : financialSummary.balanceRub > 0 ? "text-[var(--success-ink)]" : "text-[var(--ink)]"}`}>
							{hasDebt ? `-${financialSummary.formattedDebt}` : financialSummary.formattedBalance}
						</span>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
						<span className="text-[10px] text-[var(--muted)] block">Статус договора</span>
						<span className="text-sm font-bold text-[var(--ink)]">{isKnownPatient ? "Договор заключен" : "Без договора"}</span>
					</div>
				</div>
			</div>

			{/* Upcoming Appointment */}
			{upcomingAppointment && (
				<div className="p-3.5 rounded-xl bg-[var(--primary-soft)] border border-[var(--line)] space-y-2">
					<div className="flex items-center justify-between gap-2">
						<span className="font-semibold text-xs text-[var(--primary)] flex items-center gap-1.5">
							<CalendarCheck size={13} />Предстоящий приём:
						</span>
						<div className="flex items-center gap-1">
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary)] text-white">
								{upcomingAppointment.isToday ? "Сегодня" : upcomingAppointment.isTomorrow ? "Завтра" : upcomingAppointment.formattedDate}
							</span>
							{onConfirmAppointment && (
								<button
									type="button"
									data-testid="telephony-confirm-appointment-btn"
									onClick={onConfirmAppointment}
									aria-busy={isConfirmingAppointment}
									className={`h-8 px-2.5 max-sm:min-h-[44px] rounded-md text-xs font-medium inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0 ${
										isAppointmentConfirmed
											? "bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--line)]"
											: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
									}`}
									title="Подтвердить приём в расписании"
								>
									<Check className="w-3.5 h-3.5 shrink-0" />
									<span>{isAppointmentConfirmed ? "Подтверждён" : isConfirmingAppointment ? "Сохранение..." : "Подтвердить"}</span>
								</button>
							)}
							<button type="button" onClick={onSendWhatsApp} className="min-h-[32px] min-w-[32px] max-sm:min-h-[44px] max-sm:min-w-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs" title="Отправить подтверждение в WhatsApp">
								<Send size={13} />
							</button>
							<button type="button" onClick={onCopySms} className="min-h-[32px] min-w-[32px] max-sm:min-h-[44px] max-sm:min-w-[44px] rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer shadow-xs" title="Скопировать SMS">
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
					<span className="font-semibold text-[11px] text-[var(--muted)] flex items-center gap-1">
						<Clock size={11} className="text-[var(--primary)]" />Предыдущий визит:
					</span>
					<div className="text-xs text-[var(--ink)]">
						<span className="font-semibold">{lastVisitSummary.formattedLastVisit}</span>
						{lastVisitSummary.doctorName && <span className="text-[var(--muted)]"> · Врач: {lastVisitSummary.doctorName}</span>}
					</div>
				</div>
			)}
		</>
	);
}
