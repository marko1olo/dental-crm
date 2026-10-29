import {
	AlertTriangle,
	Calendar,
	Clock,
	Shield,
	Sparkles,
	User,
	Wallet,
	Zap,
} from "lucide-react";
import React from "react";
import { CHANNEL_BADGE_COLORS } from "../telephonyAttribution";
import { IncomingCallerStatusBadge } from "./IncomingCallerStatusBadge";
import type { IncomingCallerCardProps } from "./types";

interface CompactProps extends IncomingCallerCardProps {
	resolvedCategory: any;
	hasDebt: boolean;
	hasDms: boolean;
	allergyAlerts: any[];
	acutePainAlerts: any[];
}

export const IncomingCallerCardCompact: React.FC<CompactProps> = ({
	callerName,
	formattedPhone,
	initials,
	avatarColors,
	isKnownPatient,
	resolvedCategory,
	callAttribution,
	hasDebt,
	hasDms,
	financialSummary,
	upcomingAppointment,
	lastVisitSummary,
	activeTreatmentPlan,
	allergyAlerts,
	acutePainAlerts,
	className = "",
}) => {
	const doctor = upcomingAppointment?.doctorName || lastVisitSummary?.doctorName;

	return (
		<div className={`space-y-2 ${className}`}>
			{/* Top Bar: Caller Identity */}
			<div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
				<div
					className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center text-sm font-black shrink-0 shadow-xs border border-[var(--line-strong,var(--line,#e2e8f0))]"
					style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
					title={callerName}
				>
					{initials}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5 flex-wrap">
						<h3
							className="text-sm font-bold text-[var(--ink,#0f172a)] break-words leading-tight"
							title={callerName}
						>
							{callerName}
						</h3>
						<IncomingCallerStatusBadge
							isKnownPatient={isKnownPatient}
							resolvedCategory={resolvedCategory}
						/>
						{!isKnownPatient && callAttribution && (
							<span
								className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1"
								style={{
									backgroundColor: CHANNEL_BADGE_COLORS[callAttribution.channelKey].bg,
									color: CHANNEL_BADGE_COLORS[callAttribution.channelKey].text,
									border: `1px solid ${CHANNEL_BADGE_COLORS[callAttribution.channelKey].border}`,
								}}
								data-testid="incoming-call-marketing-channel-badge"
							>
								{callAttribution.channelLabel}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2 text-xs font-mono text-[var(--teal,#0d9488)] font-bold mt-0.5">
						<span>{formattedPhone}</span>
					</div>
				</div>
			</div>

			{/* Information Tiles Grid (Apple Health / Grouped Cards Style) */}
			<div className="grid grid-cols-2 gap-2 text-xs">
				{/* Tile 1: Financial Balance & Insurance */}
				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col justify-between gap-1 shadow-xs">
					<div className="flex items-center justify-between gap-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
							<Wallet size={11} className="text-[var(--teal,#0d9488)] shrink-0" />
							Баланс
						</span>
						{hasDms && (
							<span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-0.5 shrink-0">
								<Shield size={9} className="text-sky-500" /> ДМС
							</span>
						)}
					</div>
					<div className="pt-0.5">
						{hasDebt ? (
							<span className="text-xs font-bold text-rose-600 dark:text-rose-400">
								Долг: {financialSummary.formattedDebt || `${Math.abs(financialSummary.debtRub || financialSummary.balanceRub || 0)} ₽`}
							</span>
						) : (financialSummary.balanceRub || 0) > 0 ? (
							<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
								Аванс: +{financialSummary.formattedBalance || `${financialSummary.balanceRub || 0} ₽`}
							</span>
						) : (
							<span className="text-xs font-semibold text-[var(--muted,#64748b)]">
								0 ₽ (нет долга)
							</span>
						)}
					</div>
				</div>

				{/* Tile 2: Appointment / Last Visit */}
				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col justify-between gap-1 shadow-xs">
					<div className="flex items-center justify-between gap-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
							{upcomingAppointment ? (
								<>
									<Calendar size={11} className="text-[var(--teal,#0d9488)] shrink-0" />
									Запись
								</>
							) : (
								<>
									<Clock size={11} className="text-[var(--teal,#0d9488)] shrink-0" />
									Визит
								</>
							)}
						</span>
						{doctor && (
							<span
								className="text-[10px] font-medium text-[var(--ink,#0f172a)] flex items-center gap-0.5 shrink-0"
								title={`Лечащий врач: ${doctor}`}
								data-testid="incoming-caller-doctor"
							>
								<User size={10} className="text-[var(--teal,#0d9488)] shrink-0" />
								<span className="truncate max-w-[80px] sm:max-w-[110px]">{doctor}</span>
							</span>
						)}
					</div>
					<div className="pt-0.5 text-xs font-semibold text-[var(--ink,#0f172a)]">
						{upcomingAppointment ? (
							<span className="text-[var(--teal,#0d9488)] font-bold">
								{upcomingAppointment.isToday
									? "Сегодня"
									: upcomingAppointment.isTomorrow
										? "Завтра"
										: upcomingAppointment.formattedDate}{" "}
								{upcomingAppointment.formattedTime}
							</span>
						) : lastVisitSummary && lastVisitSummary.lastVisitDate ? (
							<span>
								{lastVisitSummary.formattedLastVisit.split(" в ")[0] ||
									lastVisitSummary.formattedLastVisit}
							</span>
						) : (
							<span className="text-[var(--muted,#64748b)] font-normal">Нет записей</span>
						)}
					</div>
				</div>
			</div>

			{/* Active Treatment Plan Tile */}
			{activeTreatmentPlan && activeTreatmentPlan.hasActivePlan && (
				<div
					className="p-2.5 rounded-xl border border-[var(--teal-soft)] bg-[var(--teal-surface)] flex items-center justify-between gap-2 shadow-xs"
					data-testid="incoming-call-active-plan-badge"
				>
					<div className="flex items-center gap-1.5 min-w-0">
						<Sparkles size={13} className="text-amber-500 shrink-0" />
						<span className="text-xs font-bold text-[var(--teal,#0d9488)] truncate">
							{activeTreatmentPlan.planTitle}
						</span>
					</div>
					<span className="text-[11px] font-bold text-[var(--teal,#0d9488)] font-mono shrink-0">
						{activeTreatmentPlan.progressPercent}% выполнено
					</span>
				</div>
			)}

			{/* Urgent Somatic Alerts */}
			{allergyAlerts.length > 0 && (
				<div className="p-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
					<AlertTriangle size={14} className="text-rose-600 shrink-0" />
					<span>Внимание: аллергический статус в карте пациента!</span>
				</div>
			)}

			{acutePainAlerts.length > 0 && (
				<div className="p-2 rounded-xl border border-rose-400 bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 text-xs font-bold flex items-center gap-2">
					<Zap size={14} className="text-rose-600 shrink-0" />
					<span>Острая боль! Требуется внеочередной приём (Cito)</span>
				</div>
			)}
		</div>
	);
};
