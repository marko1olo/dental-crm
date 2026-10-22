import React from "react";
import { Calendar } from "lucide-react";

export interface PayrollHeaderPeriodFiltersProps {
	readonly periodPreset: "current_month" | "previous_month" | "quarter" | "custom";
	readonly taxRegime: "employee" | "self_employed";
	readonly payoutModel: "percentage" | "chair_rental";
	readonly onSelectPeriodPreset: (preset: "current_month" | "previous_month" | "quarter" | "custom") => void;
	readonly onSetTaxRegime: (regime: "employee" | "self_employed") => void;
	readonly onSetPayoutModel: (model: "percentage" | "chair_rental") => void;
}

export const PayrollHeaderPeriodFilters: React.FC<PayrollHeaderPeriodFiltersProps> = ({
	periodPreset,
	taxRegime,
	payoutModel,
	onSelectPeriodPreset,
	onSetTaxRegime,
	onSetPayoutModel,
}) => {
	return (
		<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
			<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
				<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5 shrink-0">
					<Calendar className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					Период:
				</span>
				<div className="dente-segmented-bar max-w-full overflow-x-auto flex-nowrap shrink-0">
					<button
						type="button"
						className={`dente-segmented-item ${periodPreset === "current_month" ? "active" : ""}`}
						onClick={() => onSelectPeriodPreset("current_month")}
					>
						<span>Текущий</span>
					</button>
					<button
						type="button"
						className={`dente-segmented-item ${periodPreset === "previous_month" ? "active" : ""}`}
						onClick={() => onSelectPeriodPreset("previous_month")}
					>
						<span>Прошлый</span>
					</button>
					<button
						type="button"
						className={`dente-segmented-item ${periodPreset === "quarter" ? "active" : ""}`}
						onClick={() => onSelectPeriodPreset("quarter")}
					>
						<span>Квартал</span>
					</button>
					<button
						type="button"
						className={`dente-segmented-item ${periodPreset === "custom" ? "active" : ""}`}
						onClick={() => onSelectPeriodPreset("custom")}
					>
						<span>Период</span>
					</button>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
				<div className="flex items-center gap-1.5 justify-between sm:justify-start">
					<span className="text-xs font-semibold text-[var(--muted,#64748b)] shrink-0">
						Режим:
					</span>
					<div className="dente-segmented-bar flex-1 sm:flex-initial" data-testid="doctor-payroll-tax-regime">
						<button
							type="button"
							className={`dente-segmented-item flex-1 sm:flex-initial ${taxRegime === "employee" ? "active" : ""}`}
							onClick={() => onSetTaxRegime("employee")}
						>
							Наёмный (13-15%)
						</button>
						<button
							type="button"
							className={`dente-segmented-item flex-1 sm:flex-initial ${taxRegime === "self_employed" ? "active" : ""}`}
							onClick={() => onSetTaxRegime("self_employed")}
						>
							ИП / Самозанятый (0%)
						</button>
					</div>
				</div>

				<div className="flex items-center gap-1.5 justify-between sm:justify-start">
					<span className="text-xs font-semibold text-[var(--muted,#64748b)] shrink-0">
						Модель:
					</span>
					<div className="dente-segmented-bar flex-1 sm:flex-initial" data-testid="doctor-payroll-model-toggle">
						<button
							type="button"
							className={`dente-segmented-item flex-1 sm:flex-initial ${payoutModel === "percentage" ? "active" : ""}`}
							onClick={() => onSetPayoutModel("percentage")}
						>
							Процент от кассы
						</button>
						<button
							type="button"
							className={`dente-segmented-item flex-1 sm:flex-initial ${payoutModel === "chair_rental" ? "active" : ""}`}
							onClick={() => {
								onSetPayoutModel("chair_rental");
								onSetTaxRegime("self_employed");
							}}
						>
							Аренда кресла (Соло)
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
