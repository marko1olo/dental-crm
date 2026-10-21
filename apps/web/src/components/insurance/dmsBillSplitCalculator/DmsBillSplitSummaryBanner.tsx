/**
 * DmsBillSplitSummaryBanner.tsx — Информационный сплит-баннер и финансовые карточки визита
 */

import { ShieldCheck } from "lucide-react";
import React from "react";
import { formatCurrencyKopecks } from "../dmsSplitEngine.js";

export interface DmsBillSplitSummaryBannerProps {
	readonly totalDmsCoveredKopecks: number;
	readonly totalPatientTotalKopecks: number;
	readonly totalBillKopecks: number;
	readonly remainingLimitKopecks: number;
}

export function DmsBillSplitSummaryBanner({
	totalDmsCoveredKopecks,
	totalPatientTotalKopecks,
	totalBillKopecks,
	remainingLimitKopecks,
}: DmsBillSplitSummaryBannerProps) {
	return (
		<>
			<div className="dms-split-summary-banner" data-testid="dms-split-summary-banner">
				<div className="dms-banner-content">
					<ShieldCheck size={20} className="text-teal-600 shrink-0" />
					<div className="dms-banner-text">
						Покрыто ДМС: <strong className="text-teal-700 dark:text-teal-300 font-mono">{formatCurrencyKopecks(totalDmsCoveredKopecks)}</strong>
						<span className="dms-banner-divider"> | </span>
						Доплата пациента в кассу: <strong className="text-amber-700 dark:text-amber-300 font-mono">{formatCurrencyKopecks(totalPatientTotalKopecks)}</strong>
					</div>
				</div>
				<div className="dms-banner-sub font-mono">
					Кассовый чек: {formatCurrencyKopecks(totalPatientTotalKopecks)}
				</div>
			</div>

			<div className="dms-stats-row" style={{ marginBottom: "14px" }}>
				<div className="dms-stat-card">
					<span className="dms-stat-label">Общая сумма счета</span>
					<span className="dms-stat-value font-mono">
						{formatCurrencyKopecks(totalBillKopecks)}
					</span>
				</div>
				<div className="dms-stat-card" style={{ borderColor: "rgba(13, 148, 136, 0.4)" }}>
					<span className="dms-stat-label" style={{ color: "var(--teal, #0d9488)" }}>
						Покрывается ДМС
					</span>
					<span className="dms-stat-value font-mono" style={{ color: "var(--teal, #0d9488)" }}>
						{formatCurrencyKopecks(totalDmsCoveredKopecks)}
					</span>
				</div>
				<div className="dms-stat-card" style={{ borderColor: "rgba(217, 119, 6, 0.4)" }}>
					<span className="dms-stat-label" style={{ color: "var(--warn-fg, #d97706)" }}>
						Доплата пациента
					</span>
					<span className="dms-stat-value font-mono" style={{ color: "var(--warn-fg, #d97706)" }}>
						{formatCurrencyKopecks(totalPatientTotalKopecks)}
					</span>
				</div>
				<div className="dms-stat-card" style={{ borderColor: "rgba(13, 148, 136, 0.4)" }}>
					<span className="dms-stat-label">Остаток лимита ГП</span>
					<span
						className="dms-stat-value dms-stat-value-large font-mono font-bold text-[28px] leading-tight"
						style={{ color: "var(--teal, #0d9488)" }}
						data-testid="dms-stat-remaining-limit-value"
					>
						{formatCurrencyKopecks(remainingLimitKopecks)}
					</span>
				</div>
			</div>
		</>
	);
}
