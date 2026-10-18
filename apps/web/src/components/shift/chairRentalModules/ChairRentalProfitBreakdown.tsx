import React from "react";
import { Sparkles } from "lucide-react";
import type { ChairRentalResult } from "@dental/shared";

export interface ChairRentalProfitBreakdownProps {
	readonly economics: ChairRentalResult;
	readonly formatRub: (val: number) => string;
}

export const ChairRentalProfitBreakdown: React.FC<ChairRentalProfitBreakdownProps> = ({
	economics,
	formatRub,
}) => {
	return (
		<>
			{/* Spotlight Net Income Banner */}
			<div className="chair-rental-net-banner" data-testid="chair-rental-net-banner">
				<div>
					<span className="chair-rental-net-title">
						<Sparkles size={15} />
						Чистый доход врача за смену
					</span>
					<div className="chair-rental-net-amount" data-testid="doctor-net-profit">
						{formatRub(economics.netProfitRub)}
					</div>
				</div>

				<div className="chair-rental-net-metrics">
					<span className="chair-rental-badge-pill" data-testid="profit-margin-badge">
						{economics.profitMarginPercent}% рентабельность
					</span>
					<span className="chair-rental-hourly-rate-sub" data-testid="effective-hourly-rate">
						{formatRub(economics.effectiveHourlyIncomeRub)} / час
					</span>
				</div>
			</div>

			{/* Expense Breakdown Grid */}
			<div className="chair-rental-breakdown-grid">
				<div className="chair-rental-breakdown-card">
					<span className="chair-rental-breakdown-label">Общая выручка</span>
					<span className="chair-rental-breakdown-val" data-testid="breakdown-gross">
						{formatRub(economics.grossRevenueRub)}
					</span>
				</div>
				<div className="chair-rental-breakdown-card">
					<span className="chair-rental-breakdown-label">Аренда кресла</span>
					<span className="chair-rental-breakdown-val expense" data-testid="breakdown-rent">
						−{formatRub(economics.rentExpenseRub)}
					</span>
				</div>
				<div className="chair-rental-breakdown-card">
					<span className="chair-rental-breakdown-label">ЗТЛ (лаборатория)</span>
					<span className="chair-rental-breakdown-val expense" data-testid="breakdown-lab">
						−{formatRub(economics.labExpensesRub)}
					</span>
				</div>
				<div className="chair-rental-breakdown-card">
					<span className="chair-rental-breakdown-label">Материалы</span>
					<span className="chair-rental-breakdown-val expense" data-testid="breakdown-consumables">
						−{formatRub(economics.consumablesRub)}
					</span>
				</div>
				{economics.sterilizationExpensesRub > 0 && (
					<div className="chair-rental-breakdown-card">
						<span className="chair-rental-breakdown-label">Стерилизация инструментов</span>
						<span className="chair-rental-breakdown-val expense" data-testid="breakdown-sterilization">
							−{formatRub(economics.sterilizationExpensesRub)}
						</span>
					</div>
				)}
			</div>
		</>
	);
};
