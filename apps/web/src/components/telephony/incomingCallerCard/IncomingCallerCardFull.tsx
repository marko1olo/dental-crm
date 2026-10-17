import React from "react";
import { CalendarCheck, Check, Clock, Copy, Send, UserPlus } from "lucide-react";
import type { IncomingCallerCardProps } from "./types";
import { IncomingCallerStatusBadge } from "./IncomingCallerStatusBadge";
import { IncomingCallerFinancialStatus } from "./IncomingCallerFinancialStatus";
import { IncomingCallerSomaticAlerts } from "./IncomingCallerSomaticAlerts";
import { IncomingCallerLeadCapture } from "./IncomingCallerLeadCapture";

interface FullProps extends IncomingCallerCardProps {
	resolvedCategory: any; hasDebt: boolean; hasDms: boolean;
}

export const IncomingCallerCardFull: React.FC<FullProps> = ({
	callerName, formattedPhone, initials, avatarColors, isKnownPatient, resolvedCategory,
	birthDate, financialSummary, hasDebt, hasDms, somaticAlerts, upcomingAppointment,
	lastVisitSummary, callAttribution, isLeadCaptured, isCapturingLead, onCopyPhone,
	onSendWhatsApp, onCopySms, onCaptureLead, smsCopied, className = "",
}) => {
	return (
		<div className={`space-y-3.5 text-xs ${className}`}>
			<div className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] flex items-center gap-3">
				<div
					className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shrink-0 shadow-xs border border-[var(--line-strong,var(--line,#e2e8f0))]"
					style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
				>
					{initials}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h3 className="text-base font-bold text-[var(--ink,#0f172a)] break-words leading-tight" title={callerName}>
							{callerName}
						</h3>
						<IncomingCallerStatusBadge isKnownPatient={isKnownPatient} resolvedCategory={resolvedCategory} />
					</div>
					<div className="flex items-center gap-2 mt-0.5 flex-wrap">
						<span className="font-mono font-bold text-xs text-[var(--teal)]">{formattedPhone}</span>
						{onCopyPhone && (
							<button type="button" onClick={onCopyPhone} className="text-[10px] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] inline-flex items-center gap-0.5 cursor-pointer underline">
								<Copy size={11} /> копировать
							</button>
						)}
					</div>
					{birthDate && <span className="text-[11px] text-[var(--muted,#64748b)] block mt-0.5">Дата рождения: {birthDate}</span>}
				</div>
			</div>

			{!isKnownPatient && (
				<div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1 shadow-xs" data-testid="incoming-call-new-patient-banner">
					<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
						<UserPlus size={14} className="text-amber-600 dark:text-amber-400" />
						<span>Новый пациент</span>
					</div>
					<p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
						Номер <strong className="font-mono">{formattedPhone}</strong> не найден в базе CRM клиники. Создайте карту пациента за 5 секунд или запишите на приём без ручного ввода номера.
					</p>
				</div>
			)}

			<IncomingCallerSomaticAlerts somaticAlerts={somaticAlerts} />
			<IncomingCallerFinancialStatus financialSummary={financialSummary} isKnownPatient={isKnownPatient} hasDebt={hasDebt} hasDms={hasDms} />

			{upcomingAppointment && (
				<div className="p-3.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] space-y-2">
					<div className="flex items-center justify-between">
						<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
							<CalendarCheck size={13} /> Предстоящий приём:
						</span>
						<div className="flex items-center gap-1">
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-white">
								{upcomingAppointment.isToday ? "Сегодня" : upcomingAppointment.isTomorrow ? "Завтра" : upcomingAppointment.formattedDate}
							</span>
							{onSendWhatsApp && (
								<button type="button" onClick={onSendWhatsApp} className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs" title="WhatsApp">
									<Send size={13} />
								</button>
							)}
							{onCopySms && (
								<button type="button" onClick={onCopySms} className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer shadow-xs" title="SMS">
									{smsCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
								</button>
							)}
						</div>
					</div>
					<div className="text-xs text-[var(--ink,#0f172a)] space-y-0.5">
						<div className="font-bold">Время: {upcomingAppointment.formattedTime}</div>
						<div className="text-[var(--muted,#64748b)]">Врач: {upcomingAppointment.doctorName}</div>
					</div>
				</div>
			)}

			{lastVisitSummary && (
				<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-1">
					<span className="font-bold text-[10px] uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
						<Clock size={11} className="text-[var(--teal)]" /> Предыдущий визит:
					</span>
					<div className="text-xs text-[var(--ink,#0f172a)]">
						<span className="font-semibold">{lastVisitSummary.formattedLastVisit}</span>
						{lastVisitSummary.doctorName && <span className="text-[var(--muted,#64748b)]"> · Врач: {lastVisitSummary.doctorName}</span>}
					</div>
				</div>
			)}

			{!isKnownPatient && callAttribution && (
				<IncomingCallerLeadCapture callAttribution={callAttribution} isLeadCaptured={isLeadCaptured} isCapturingLead={isCapturingLead} onCaptureLead={onCaptureLead} />
			)}
		</div>
	);
};
