/**
 * DmsBillSplitMobileCards.tsx — Нативные сгруппированные карточки (Apple iOS HIG) для мобильного экрана
 */

import React from "react";
import { formatCurrencyKopecks } from "../dmsSplitEngine.js";
import type { SplitOverrideMode } from "./useDmsBillSplitLogic.js";

export interface DmsBillSplitMobileCardsProps {
	readonly effectiveLines: readonly any[];
	readonly onSetOverride: (itemId: string, mode: SplitOverrideMode) => void;
}

export function DmsBillSplitMobileCards({
	effectiveLines,
	onSetOverride,
}: DmsBillSplitMobileCardsProps) {
	return (
		<div className="dms-mobile-grouped-list">
			{effectiveLines.map((line) => {
				const itemId = line.lineItemId || line.id || "";
				return (
					<div key={line.id} className="dms-mobile-grouped-card">
						<div className="dms-mobile-card-top">
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="dms-mobile-code-badge font-mono">{line.serviceCode804n}</span>
								{line.toothNumber && (
									<span className="dms-mobile-tooth-badge font-mono">Зуб {line.toothNumber}</span>
								)}
							</div>
							<div className="dms-mobile-card-price font-mono font-bold">
								{formatCurrencyKopecks(line.totalKopecks)}
							</div>
						</div>
						<div className="dms-mobile-card-name">{line.serviceName}</div>
						<div className="dms-mobile-segmented-control">
							<button type="button" className={`dms-mobile-segment-btn ${line.overrideMode === "dms" ? "active" : ""}`} onClick={() => onSetOverride(itemId, "dms")}>
								ДМС
							</button>
							<button type="button" className={`dms-mobile-segment-btn ${line.overrideMode === "patient" ? "active" : ""}`} onClick={() => onSetOverride(itemId, "patient")}>
								Пациент
							</button>
							<button type="button" className={`dms-mobile-segment-btn ${line.overrideMode === "split_50" ? "active" : ""}`} onClick={() => onSetOverride(itemId, "split_50")}>
								Сплит 50/50
							</button>
							<button type="button" className={`dms-mobile-segment-btn ${line.overrideMode === "auto" ? "active" : ""}`} onClick={() => onSetOverride(itemId, "auto")}>
								Авто
							</button>
						</div>
						<div className="dms-mobile-card-breakdown">
							<div className="dms-mobile-breakdown-row">
								<span className="text-[var(--muted,#64748b)]">Покрыто ДМС:</span>
								<span className="font-mono font-bold text-teal-600 dark:text-teal-400">
									{formatCurrencyKopecks(line.effectiveDmsKopecks)}
								</span>
							</div>
							<div className="dms-mobile-breakdown-row">
								<span className="text-[var(--muted,#64748b)]">Доплата в кассу:</span>
								<span className="font-mono font-bold text-amber-600 dark:text-amber-400">
									{formatCurrencyKopecks(line.effectivePatientKopecks)}
								</span>
							</div>
						</div>
						<div className="dms-mobile-card-status">
							<span className="dms-badge dms-badge-active" style={{ fontSize: "0.6875rem" }}>
								{line.splitReason || (line.effectivePatientKopecks === 0 ? "Одобрено 100%" : "Франшиза")}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
