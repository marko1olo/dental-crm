/**
 * DmsCoverageStatsRow.tsx — Сводная полоса лимитов и прогресс-бар использования гарантийного письма
 */

import React from "react";
import { formatRubKopecks } from "../insuranceMath.js";

export interface DmsCoverageStatsRowProps {
	readonly maxCoverageRub: number;
	readonly usedAmountRub: number;
	readonly remainingLimitRub: number;
	readonly usagePercent: number;
}

export function DmsCoverageStatsRow({
	maxCoverageRub,
	usedAmountRub,
	remainingLimitRub,
	usagePercent,
}: DmsCoverageStatsRowProps) {
	const barColor =
		usagePercent >= 100
			? "var(--bad-fg, #dc2626)"
			: usagePercent >= 80
			? "var(--warn-fg, #d97706)"
			: "var(--teal, #0d9488)";

	return (
		<>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", paddingTop: "10px", borderTop: "1px solid var(--line, #e2e8f0)" }}>
				<div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Лимит письма</div>
					<div className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						{formatRubKopecks(maxCoverageRub)}
					</div>
				</div>
				<div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Использовано ({usagePercent}%)</div>
					<div className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
						{formatRubKopecks(usedAmountRub)}
					</div>
				</div>
				<div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Остаток лимита</div>
					<div className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--teal, #0d9488)" }}>
						{formatRubKopecks(remainingLimitRub)}
					</div>
				</div>
			</div>
			<div style={{ height: "6px", width: "100%", background: "var(--line, #e2e8f0)", borderRadius: "999px", overflow: "hidden" }} aria-label={`Использовано ${usagePercent}% лимита гарантийного письма`}>
				<div style={{ height: "100%", width: `${usagePercent}%`, background: barColor, transition: "width 0.2s ease" }} />
			</div>
		</>
	);
}
