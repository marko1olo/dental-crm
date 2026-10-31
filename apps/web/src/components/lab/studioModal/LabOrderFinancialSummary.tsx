/**
 * apps/web/src/components/lab/studioModal/LabOrderFinancialSummary.tsx
 *
 * DENTE Dental CRM — Dental Lab Order Financial Breakdown.
 * Real integer kopecks accounting: lab cost, patient price, net clinic revenue.
 * Mandate 8b modular design, Mandate 8e financial transparency.
 */

import React from "react";
import {
	formatKopecksToRubles,
	calcNetRevenueKopecks,
	type OrthopedicMaterialMeta,
} from "../dentalLabCatalogData";

export interface LabOrderFinancialSummaryProps {
	readonly material: OrthopedicMaterialMeta;
	readonly teethCount: number;
}

export const LabOrderFinancialSummary: React.FC<LabOrderFinancialSummaryProps> = ({
	material,
	teethCount,
}) => {
	const count = teethCount > 0 ? teethCount : 1;
	const totalLabCostKopecks = material.baseLabCostKopecks * count;
	const totalPatientPriceKopecks = material.defaultPatientPriceKopecks * count;
	const netRevenueKopecks = calcNetRevenueKopecks(totalPatientPriceKopecks, totalLabCostKopecks);

	return (
		<div className="p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs space-y-1.5 shrink-0">
			<div className="flex justify-between text-[var(--ink-muted)]">
				<span>Себестоимость ЗТЛ ({count} ед.):</span>
				<strong className="text-[var(--ink)]">
					{formatKopecksToRubles(totalLabCostKopecks)}
				</strong>
			</div>
			<div className="flex justify-between text-[var(--ink-muted)]">
				<span>Прайс пациенту:</span>
				<strong className="text-[var(--ink)]">
					{formatKopecksToRubles(totalPatientPriceKopecks)}
				</strong>
			</div>
			<div className="flex justify-between pt-1.5 border-t border-[var(--line)] font-bold">
				<span className="text-[var(--teal)]">Доход клиники:</span>
				<span className="text-[var(--teal)]">
					{formatKopecksToRubles(netRevenueKopecks)}
				</span>
			</div>
		</div>
	);
};

export default LabOrderFinancialSummary;
