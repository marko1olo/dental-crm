import { AlertCircle, Clock, UserCheck, Wallet } from "lucide-react";
import React from "react";
import type { PatientFinancialSummary, PatientLastVisitSummary } from "../../../../store/telephonyStore";
import type { CallAttribution } from "../../telephonyAttribution";

export interface TelephonyCallerIdentityCardProps {
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string; border?: string | undefined };
	isKnownPatient: boolean;
	isWsConnected?: boolean | undefined;
	callAttribution: CallAttribution | null;
	financialSummary?: PatientFinancialSummary | null | undefined;
	lastVisitSummary?: PatientLastVisitSummary | null | undefined;
}

export function TelephonyCallerIdentityCard({
	callerName,
	formattedPhone,
	initials,
	avatarColors,
	isKnownPatient,
	isWsConnected,
	callAttribution,
	financialSummary,
	lastVisitSummary,
}: TelephonyCallerIdentityCardProps): React.JSX.Element {
	return (
		<>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2.5 min-w-0">
					<div
						className="dnt-caller-avatar"
						style={{
							backgroundColor: avatarColors.bg,
							color: avatarColors.text,
							borderColor: avatarColors.border || "var(--line)",
						}}
					>
						{initials}
					</div>
					<div className="min-w-0">
						<h3 className="font-bold text-sm text-[var(--ink,#0f172a)] leading-snug" title={callerName}>
							{callerName}
						</h3>
						<div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-mono text-[var(--muted,#64748b)] mt-0.5">
							<span className="whitespace-nowrap">{formattedPhone}</span>
							{!isWsConnected && (
								<span
									className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 font-sans flex items-center gap-1 animate-pulse shrink-0"
									title="Связь с сервером телефонии восстанавливается..."
									data-testid="telephony-card-reconnecting"
								>
									<span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex flex-col items-end gap-1 shrink-0">
					{isKnownPatient ? (
						<span className="dnt-badge-patient">
							<UserCheck size={11} />
							<span>Пациент клиники</span>
						</span>
					) : (
						<span className="dnt-badge-lead">
							<AlertCircle size={11} />
							<span>Новое обращение</span>
						</span>
					)}
					{callAttribution && <span className="dnt-badge-source">{callAttribution.channelLabel}</span>}
				</div>
			</div>

			{isKnownPatient && (
				<div className="dnt-patient-metrics-row">
					<div className="dnt-metric-box">
						<div className="dnt-metric-label">
							<Wallet size={11} />
							<span>Баланс счёта</span>
						</div>
						<div className={`dnt-metric-value ${financialSummary?.hasDebt ? "dnt-metric-value--debt" : ""}`}>
							{financialSummary?.hasDebt
								? `Долг ${financialSummary.formattedDebt}`
								: financialSummary?.formattedBalance || "0 ₽"}
						</div>
					</div>
					<div className="dnt-metric-box">
						<div className="dnt-metric-label">
							<Clock size={11} />
							<span>История визитов</span>
						</div>
						<div className="dnt-metric-value">
							{lastVisitSummary?.lastVisitDate
								? lastVisitSummary.formattedLastVisit
								: "Постоянный пациент"}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
