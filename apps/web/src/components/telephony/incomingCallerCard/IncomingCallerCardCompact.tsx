import React from "react";
import { AlertTriangle, Calendar, Clock, Shield, Sparkles, User, Zap } from "lucide-react";
import type { IncomingCallerCardProps } from "./types";
import { IncomingCallerStatusBadge } from "./IncomingCallerStatusBadge";
import { CHANNEL_BADGE_COLORS } from "../telephonyAttribution";

interface CompactProps extends IncomingCallerCardProps {
	resolvedCategory: any;
	hasDebt: boolean;
	hasDms: boolean;
	allergyAlerts: any[];
	acutePainAlerts: any[];
}

export const IncomingCallerCardCompact: React.FC<CompactProps> = ({
	callerName, formattedPhone, initials, avatarColors, isKnownPatient,
	resolvedCategory, callAttribution, hasDebt, hasDms, financialSummary,
	upcomingAppointment, lastVisitSummary, activeTreatmentPlan,
	allergyAlerts, acutePainAlerts, className = "",
}) => {
	const doctor = upcomingAppointment?.doctorName || lastVisitSummary?.doctorName;
	return (
		<div className={`space-y-1.5 ${className}`}>
			<div className="flex items-center gap-2.5">
				<div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 shadow-xs border border-[var(--line-strong,var(--line,#e2e8f0))]" style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }} title={callerName}>
					{initials}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5 flex-wrap">
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] break-words leading-tight" title={callerName}>{callerName}</h3>
						<IncomingCallerStatusBadge isKnownPatient={isKnownPatient} resolvedCategory={resolvedCategory} />
						{!isKnownPatient && callAttribution && (
							<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1" style={{ backgroundColor: CHANNEL_BADGE_COLORS[callAttribution.channelKey].bg, color: CHANNEL_BADGE_COLORS[callAttribution.channelKey].text, border: `1px solid ${CHANNEL_BADGE_COLORS[callAttribution.channelKey].border}` }} data-testid="incoming-call-marketing-channel-badge">
								{callAttribution.channelLabel}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2 text-xs font-mono text-[var(--muted,#64748b)]">
						<span className="font-bold text-[var(--ink,#0f172a)] shrink-0">{formattedPhone}</span>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
				{hasDebt ? (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
						Долг: {financialSummary.formattedDebt || `${Math.abs(financialSummary.debtRub || financialSummary.balanceRub || 0)} ₽`}
					</span>
				) : (financialSummary.balanceRub || 0) > 0 ? (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
						Аванс: +{financialSummary.formattedBalance || `${financialSummary.balanceRub || 0} ₽`}
					</span>
				) : (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)] shrink-0">Баланс: 0 ₽</span>
				)}
				{hasDms && (
					<span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1 shrink-0">
						<Shield size={10} className="text-sky-500" /> ДМС
					</span>
				)}
				{upcomingAppointment ? (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] flex items-center gap-1 min-w-0 max-w-[220px]">
						<Calendar size={11} className="shrink-0" /><span className="truncate">{upcomingAppointment.isToday ? "Сегодня" : upcomingAppointment.isTomorrow ? "Завтра" : upcomingAppointment.formattedDate} {upcomingAppointment.formattedTime}</span>
					</span>
				) : lastVisitSummary && lastVisitSummary.lastVisitDate ? (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] flex items-center gap-1 min-w-0 max-w-[220px]">
						<Clock size={11} className="text-[var(--teal)] shrink-0" /><span className="truncate">Визит: {lastVisitSummary.formattedLastVisit.split(" в ")[0] || lastVisitSummary.formattedLastVisit}</span>
					</span>
				) : (
					<span className="px-2 py-0.5 rounded-full text-[11px] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)]">Нет записей</span>
				)}
				{doctor && (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] flex items-center gap-1 shrink-0" title={`Лечащий врач: ${doctor}`} data-testid="incoming-caller-doctor">
						<User size={11} className="text-[var(--teal)] shrink-0" /><span className="truncate max-w-[150px]">{doctor}</span>
					</span>
				)}
				{activeTreatmentPlan && activeTreatmentPlan.hasActivePlan && (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] flex items-center gap-1 min-w-0 max-w-[240px]" data-testid="incoming-call-active-plan-badge">
						<Sparkles size={11} className="text-amber-500 shrink-0" /><span className="truncate">{activeTreatmentPlan.planTitle} ({activeTreatmentPlan.progressPercent}%)</span>
					</span>
				)}
				{allergyAlerts.length > 0 && (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
						<AlertTriangle size={11} className="text-rose-600 shrink-0" /> Аллергия
					</span>
				)}
				{acutePainAlerts.length > 0 && (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
						<Zap size={11} className="text-rose-600 shrink-0" /> Острая боль
					</span>
				)}
			</div>
		</div>
	);
};
