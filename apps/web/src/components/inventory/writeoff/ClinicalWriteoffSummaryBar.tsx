import type React from "react";
import type { ClinicalWriteoffTotals } from "./clinicalWriteoffEngine.js";

export interface ClinicalWriteoffSummaryBarProps {
	readonly servicesCount: number;
	readonly totals: ClinicalWriteoffTotals;
}

export const ClinicalWriteoffSummaryBar: React.FC<ClinicalWriteoffSummaryBarProps> = ({
	servicesCount,
	totals,
}) => {
	return (
		<div className="cw-summary-bar">
			<div className="flex flex-col">
				<span className="text-xs font-semibold text-muted uppercase">Услуг в наряде</span>
				<span className="text-lg font-black text-ink">{servicesCount} проц.</span>
			</div>

			<div className="flex flex-col">
				<span className="text-xs font-semibold text-muted uppercase">Расходников списано</span>
				<span className="text-lg font-black text-ink">{totals.totalMaterialsQuantity} ед.</span>
			</div>

			<div className="flex flex-col">
				<span className="text-xs font-semibold text-muted uppercase">Сумма списания (Себестоимость)</span>
				<span className="text-xl font-extrabold text-teal-dark">{totals.totalCostFormatted}</span>
			</div>

			<div className="flex flex-col">
				<span className="text-xs font-semibold uppercase text-muted">Сумма отклонений</span>
				<span className="text-lg font-black text-ink">{totals.totalDiscrepancyCostFormatted}</span>
			</div>
		</div>
	);
};
