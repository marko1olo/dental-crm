/**
 * CbctSidebarRidgeCaliperPanel.tsx — Панель замеров альвеолярного гребня (Мандат 8b).
 */

import React from "react";
import type { AlveolarRidgeCaliperMeasurement } from "../../cbctCaliperNerveMath";

export interface CbctSidebarRidgeCaliperPanelProps {
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
}

export const CbctSidebarRidgeCaliperPanel: React.FC<CbctSidebarRidgeCaliperPanelProps> = ({
	activeCaliper,
	ridgeHeightMm,
	ridgeWidthMm,
}) => {
	const h = activeCaliper?.heightMm ?? ridgeHeightMm ?? 11.5;
	const w = activeCaliper?.crestWidthMm ?? ridgeWidthMm ?? 6.8;
	const feasibility = activeCaliper?.implantFeasibility;

	return (
		<div className="flex flex-col gap-2 p-2.5 bg-[var(--paper)] rounded-lg border border-[var(--line)] text-xs">
			<div className="flex justify-between items-center">
				<span className="font-semibold text-[var(--text)]">Альвеолярный гребень</span>
				<span className="text-[10px] text-[var(--primary)] font-medium">Штангенциркуль</span>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<div className="p-1.5 rounded bg-[var(--paper-strong)] border border-[var(--line)]">
					<div className="text-[10px] text-[var(--text-muted)]">Высота гребня</div>
					<div className="text-sm font-bold text-[var(--text)]">{h.toFixed(1)} мм</div>
				</div>
				<div className="p-1.5 rounded bg-[var(--paper-strong)] border border-[var(--line)]">
					<div className="text-[10px] text-[var(--text-muted)]">Ширина гребня</div>
					<div className="text-sm font-bold text-[var(--text)]">{w.toFixed(1)} мм</div>
				</div>
			</div>

			{feasibility && (
				<div className={`p-1.5 rounded text-[11px] leading-tight border ${
					feasibility.isAdequate
						? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30"
						: "bg-[var(--warning,orange)]/10 text-[var(--warning,orange)] border-[var(--warning,orange)]/30"
				}`}>
					{feasibility.clinicalAdviceRu}
				</div>
			)}
		</div>
	);
};
