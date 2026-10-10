/**
 * DENTE CRM — Treatment Plan Roadmap Timeline Header & Tax Deduction Banner
 * (Layer 4: Presentation Subcomponent — progress bar, total/paid/remaining metrics, 13% FNS breakdown)
 */

import React from "react";
import { Coins, FileBadge, Percent } from "lucide-react";
import type { calculatePlanTaxDeductionBreakdown } from "@dental/shared";
import { formatKopecksToRubExact } from "./roadmapPriceHelpers.js";

export interface RoadmapTimelineHeaderProps {
	planTitle: string;
	planNumber: string;
	curatingDoctorName: string;
	patientFullName: string;
	progressPercent: number;
	grandTotalKopecks: number;
	completedTotalKopecks: number;
	remainingTotalKopecks: number;
	taxBreakdown: ReturnType<typeof calculatePlanTaxDeductionBreakdown>;
	onRequestTaxCertificate?: (() => void) | undefined;
}

export const RoadmapTimelineHeader: React.FC<RoadmapTimelineHeaderProps> = ({
	planTitle,
	planNumber,
	curatingDoctorName,
	patientFullName,
	progressPercent,
	grandTotalKopecks,
	completedTotalKopecks,
	remainingTotalKopecks,
	taxBreakdown,
	onRequestTaxCertificate,
}) => {
	return (
		<>
			{/* 1. Hero Progress Overview Card */}
			<div className="roadmap-hero" data-testid="roadmap-hero">
				<div className="roadmap-header-row">
					<div>
						<div className="text-xs font-semibold text-[var(--brand,#0d9488)] uppercase tracking-wider">
							{planNumber} • Куратор: {curatingDoctorName}
						</div>
						<h3 className="roadmap-title">{planTitle}</h3>
						<div className="roadmap-subtitle">Пациент: {patientFullName}</div>
					</div>

					<div className="roadmap-percent-pill" data-testid="roadmap-percent-pill">
						<Percent className="w-3.5 h-3.5" />
						<span>{progressPercent}% выполнено</span>
					</div>
				</div>

				{/* Progress bar */}
				<div className="roadmap-progress-bar-bg">
					<div
						className="roadmap-progress-bar-fill"
						style={{ width: `${progressPercent}%` }}
						data-testid="roadmap-progress-bar-fill"
					/>
				</div>

				{/* Financial Metrics in Exact Rubles & Kopecks */}
				<div className="roadmap-metrics-grid">
					<div className="roadmap-metric-card">
						<div className="roadmap-metric-label">Общая стоимость плана</div>
						<div className="roadmap-metric-value" data-testid="metric-total-cost">
							{formatKopecksToRubExact(grandTotalKopecks)} ₽
						</div>
					</div>

					<div className="roadmap-metric-card">
						<div className="roadmap-metric-label">Оплачено и выполнено</div>
						<div className="roadmap-metric-value text-emerald-400" data-testid="metric-completed-cost">
							{formatKopecksToRubExact(completedTotalKopecks)} ₽
						</div>
					</div>

					<div className="roadmap-metric-card">
						<div className="roadmap-metric-label">Остаток к оплате</div>
						<div className="roadmap-metric-value text-amber-400" data-testid="metric-remaining-cost">
							{formatKopecksToRubExact(remainingTotalKopecks)} ₽
						</div>
					</div>
				</div>
			</div>

			{/* 2. 13% Tax Deduction Banner (FNS Code 01 / Code 02) */}
			<div className="roadmap-tax-banner" data-testid="roadmap-tax-banner">
				<div className="flex items-start gap-3">
					<div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
						<Coins className="w-5 h-5" />
					</div>
					<div>
						<div className="text-sm font-bold text-[var(--ink)] flex items-center gap-2 flex-wrap">
							<span>Налоговый вычет 13% (Возврат от ФНС России)</span>
							<span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
								+{formatKopecksToRubExact(taxBreakdown.grandTotalRefund13Kopecks)} ₽
							</span>
						</div>
						<div className="text-xs text-[var(--muted,var(--ink-muted))] mt-1 leading-relaxed">
							{taxBreakdown.hasCode02ExpensiveServices ? (
								<>
									План включает дорогостоящее лечение (Код 02: имплантация) — вычет 13% рассчитывается{" "}
									<strong className="text-[var(--ink)]">со всей суммы без лимита</strong>.
								</>
							) : (
								<>
									Стандартное лечение (Код 01) — лимит вычета до 150 000 ₽ в год (возврат до 19 500 ₽).
								</>
							)}
							<div className="mt-0.5 text-[var(--ink)]">
								Итоговая стоимость с учетом возврата:{" "}
								<strong className="text-emerald-600 dark:text-emerald-400 font-bold">
									{formatKopecksToRubExact(taxBreakdown.netPriceWithRefundKopecks)} ₽
								</strong>
							</div>
						</div>
					</div>
				</div>

				<div className="flex-shrink-0 flex items-center">
					<button
						type="button"
						onClick={onRequestTaxCertificate}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-sky-500/30 text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:white hover:bg-sky-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
						data-testid="request-tax-cert-btn"
					>
						<FileBadge className="w-3.5 h-3.5" />
						<span>Справка для ФНС</span>
					</button>
				</div>
			</div>
		</>
	);
};

export default RoadmapTimelineHeader;
