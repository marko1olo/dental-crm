/**
 * DENTE Dental CRM — Schedule Shift Intelligence Analytics Grid
 *
 * Compliance:
 * - Mandate 8d: Apple HIG, Medical Density, WCAG contrast (var(--paper), var(--ink))
 * - Mandate 8e: Doctor Autonomy, non-blocking informative dashboard
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import React from "react";
import type { Dashboard, ResourceLoad } from "@dental/shared";
import { Users, UserCheck, Armchair, AlertCircle } from "lucide-react";

export interface ScheduleShiftWarning {
	id: string;
	title: string;
	detail?: string | undefined;
	severity?: "critical" | "warning" | "info" | string | undefined;
	actionLabel?: string | undefined;
}

export interface ScheduleShiftAnalyticsProps {
	readonly dashboard?: Dashboard | null | undefined;
	readonly shiftWarnings?: readonly ScheduleShiftWarning[] | ScheduleShiftWarning[] | undefined;
	readonly onOpenWarning?: ((warning: ScheduleShiftWarning) => void) | undefined;
	readonly className?: string | undefined;
}

export const ScheduleShiftAnalytics: React.FC<ScheduleShiftAnalyticsProps> = ({
	dashboard,
	shiftWarnings = [],
	onOpenWarning,
	className = "",
}) => {
	const doctorLoads: ResourceLoad[] = dashboard?.shiftIntelligence?.doctorLoads ?? [];
	const assistantLoads: ResourceLoad[] = dashboard?.shiftIntelligence?.assistantLoads ?? [];
	const chairLoads: ResourceLoad[] = dashboard?.shiftIntelligence?.chairLoads ?? [];
	const warningsList = shiftWarnings ?? [];

	const doctorSummaryText = doctorLoads
		.map((load: ResourceLoad) => `${(load?.title ?? "").split(" ")[0]} ${load?.utilizationPercent ?? 0}%`)
		.join(" · ");

	const assistantSummaryText = assistantLoads
		.map((load: ResourceLoad) => `${(load?.title ?? "").split(" ")[0]} ${load?.utilizationPercent ?? 0}%`)
		.join(" · ") || "не назначены";

	const chairSummaryText = chairLoads
		.map((load: ResourceLoad) => `${load?.title ?? ""} ${load?.utilizationPercent ?? 0}%`)
		.join(" · ");

	const firstWarning = warningsList[0];
	const controlSummaryText = firstWarning?.title ?? "Нет предупреждений";

	return (
		<div
			className={`schedule-command-grid min-w-0 ${className}`.trim()}
			data-testid="schedule-shift-analytics"
			role="region"
			aria-label="Аналитика загрузки смены"
		>
			<article className="min-w-0 flex flex-col justify-between" data-testid="analytics-card-doctors">
				<div className="flex items-center justify-between gap-1">
					<span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
						<Users size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" aria-hidden="true" />
						Врачи
					</span>
					<strong className="text-base font-bold text-[var(--ink)]">
						{doctorLoads.length}
					</strong>
				</div>
				<p
					className="break-words text-xs text-[var(--muted)] truncate max-w-full mt-1"
					title={doctorSummaryText || "Врачи не назначены"}
				>
					{doctorSummaryText || "нет данных"}
				</p>
			</article>

			<article className="min-w-0 flex flex-col justify-between" data-testid="analytics-card-assistants">
				<div className="flex items-center justify-between gap-1">
					<span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
						<UserCheck size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" aria-hidden="true" />
						Ассистенты
					</span>
					<strong className="text-base font-bold text-[var(--ink)]">
						{assistantLoads.length}
					</strong>
				</div>
				<p
					className="break-words text-xs text-[var(--muted)] truncate max-w-full mt-1"
					title={assistantSummaryText}
				>
					{assistantSummaryText}
				</p>
			</article>

			<article className="min-w-0 flex flex-col justify-between" data-testid="analytics-card-chairs">
				<div className="flex items-center justify-between gap-1">
					<span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
						<Armchair size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" aria-hidden="true" />
						Кресла
					</span>
					<strong className="text-base font-bold text-[var(--ink)]">
						{chairLoads.length}
					</strong>
				</div>
				<p
					className="break-words text-xs text-[var(--muted)] truncate max-w-full mt-1"
					title={chairSummaryText || "Кресла не загружены"}
				>
					{chairSummaryText || "нет загрузки"}
				</p>
			</article>

			<article
				className={`min-w-0 flex flex-col justify-between ${
					warningsList.length > 0 ? "border-amber-500/30 bg-amber-500/5" : ""
				} ${onOpenWarning && firstWarning ? "cursor-pointer hover:border-amber-500/60" : ""}`}
				data-testid="analytics-card-control"
				onClick={() => {
					if (onOpenWarning && firstWarning) {
						onOpenWarning(firstWarning);
					}
				}}
			>
				<div className="flex items-center justify-between gap-1">
					<span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
						<AlertCircle
							size={14}
							className={warningsList.length > 0 ? "text-amber-500 shrink-0" : "text-[var(--teal)] shrink-0"}
							aria-hidden="true"
						/>
						Контроль
					</span>
					<strong
						className={`text-base font-bold ${
							warningsList.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-[var(--ink)]"
						}`}
					>
						{warningsList.length}
					</strong>
				</div>
				<p
					className="break-words text-xs text-[var(--muted)] truncate max-w-full mt-1"
					title={controlSummaryText}
				>
					{controlSummaryText}
				</p>
			</article>
		</div>
	);
};

export default ScheduleShiftAnalytics;
