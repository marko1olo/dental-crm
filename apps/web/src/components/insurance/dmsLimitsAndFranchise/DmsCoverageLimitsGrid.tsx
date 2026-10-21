/**
 * DmsCoverageLimitsGrid.tsx — Сетка лимитов покрытия гарантийного письма ДМС
 */

import React from "react";
import { formatRubKopecks } from "../insuranceMath.js";

export interface DmsCoverageLimitsGridProps {
	readonly maxCoverageRub: number;
	readonly usedAmountRub: number;
	readonly remainingLimitRub: number;
	readonly onMaxCoverageChange: (val: number) => void;
	readonly onUsedAmountChange: (val: number) => void;
	readonly maxCoverageInputId: string;
	readonly usedAmountInputId: string;
}

export function DmsCoverageLimitsGrid({
	maxCoverageRub,
	usedAmountRub,
	remainingLimitRub,
	onMaxCoverageChange,
	onUsedAmountChange,
	maxCoverageInputId,
	usedAmountInputId,
}: DmsCoverageLimitsGridProps) {
	return (
		<div className="dms-grid-3">
			<div className="dms-field-group">
				<label htmlFor={maxCoverageInputId} className="dms-label">Согласованный лимит ГП (₽) *</label>
				<input
					id={maxCoverageInputId}
					type="number"
					min="0"
					step="500"
					value={maxCoverageRub}
					onChange={(e) => onMaxCoverageChange(Number(e.target.value) || 0)}
					className="dms-input font-mono font-bold"
				/>
			</div>
			<div className="dms-field-group">
				<label htmlFor={usedAmountInputId} className="dms-label">Израсходовано по ГП (₽)</label>
				<input
					id={usedAmountInputId}
					type="number"
					min="0"
					step="100"
					value={usedAmountRub}
					onChange={(e) => onUsedAmountChange(Number(e.target.value) || 0)}
					className="dms-input font-mono"
				/>
			</div>
			<div className="dms-field-group">
				<span className="dms-label">Остаток лимита</span>
				<div className="dms-stat-value-large font-mono font-bold flex items-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[28px] leading-tight min-h-[46px]">
					{formatRubKopecks(remainingLimitRub)}
				</div>
			</div>
		</div>
	);
}
