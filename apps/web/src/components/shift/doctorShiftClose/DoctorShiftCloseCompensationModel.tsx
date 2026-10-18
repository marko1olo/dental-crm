import React from "react";
import { Calculator } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { DoctorShiftStats } from "../controlBarModules/shiftControlBarTypes";
import type { DoctorShiftCompensationModel as CompensationModelType } from "./doctorShiftCloseTypes";
import { DoctorShiftCompensationInputs } from "./DoctorShiftCompensationInputs";

export interface DoctorShiftCloseCompensationModelProps {
	readonly shiftStats: DoctorShiftStats;
	readonly compensationModel: CompensationModelType;
	readonly onSetCompensationModel: (model: CompensationModelType) => void;
	readonly commissionPct: number;
	readonly onSetCommissionPct: (pct: number) => void;
	readonly labDeductionsRub: number;
	readonly onSetLabDeductionsRub: (rub: number) => void;
	readonly fixedRentRub: number;
	readonly onSetFixedRentRub: (rub: number) => void;
	readonly baseSalaryRub: number;
	readonly onSetBaseSalaryRub: (rub: number) => void;
	readonly calculatedPayoutRub: number;
}

export const DoctorShiftCloseCompensationModel: React.FC<DoctorShiftCloseCompensationModelProps> = ({
	shiftStats,
	compensationModel,
	onSetCompensationModel,
	commissionPct,
	onSetCommissionPct,
	labDeductionsRub,
	onSetLabDeductionsRub,
	fixedRentRub,
	onSetFixedRentRub,
	baseSalaryRub,
	onSetBaseSalaryRub,
	calculatedPayoutRub,
}) => {
	const revenueRub = shiftStats.totalRevenueRub;
	const netBaseAfterLab = Math.max(0, revenueRub - labDeductionsRub);

	return (
		<div className="border border-[var(--teal,#0d9488)]/30 rounded-xl p-3.5 sm:p-4 bg-[var(--teal-soft,#f0fdfa)]/50 space-y-3">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<span className="text-xs font-bold text-[var(--teal,#0d9488)] uppercase tracking-wider flex items-center gap-1.5">
					<Calculator className="w-3.5 h-3.5" /> Модель расчёта заработка
				</span>
				<div className="dente-segmented-bar" role="group" aria-label="Модель начисления смены">
					<button
						type="button"
						className={`dente-segmented-item ${compensationModel === "piece_rate" ? "active" : ""}`}
						onClick={() => onSetCompensationModel("piece_rate")}
						data-testid="shift-model-piece-rate"
					>
						Сдельщина (% от услуг)
					</button>
					<button
						type="button"
						className={`dente-segmented-item ${compensationModel === "chair_rental" ? "active" : ""}`}
						onClick={() => onSetCompensationModel("chair_rental")}
						data-testid="shift-model-chair-rental"
					>
						Аренда кресла (фикс)
					</button>
					<button
						type="button"
						className={`dente-segmented-item ${compensationModel === "salary_plus_bonus" ? "active" : ""}`}
						onClick={() => onSetCompensationModel("salary_plus_bonus")}
						data-testid="shift-model-salary-bonus"
					>
						Оклад + %
					</button>
				</div>
			</div>

			<DoctorShiftCompensationInputs
				compensationModel={compensationModel}
				commissionPct={commissionPct}
				onSetCommissionPct={onSetCommissionPct}
				labDeductionsRub={labDeductionsRub}
				onSetLabDeductionsRub={onSetLabDeductionsRub}
				fixedRentRub={fixedRentRub}
				onSetFixedRentRub={onSetFixedRentRub}
				baseSalaryRub={baseSalaryRub}
				onSetBaseSalaryRub={onSetBaseSalaryRub}
			/>

			<div className="pt-2 border-t border-[var(--teal,#0d9488)]/20">
				<div className="flex items-center justify-between mb-1">
					<span className="text-xs font-bold text-[var(--teal,#0d9488)] uppercase tracking-wider">
						Начисленный заработок врача за смену
					</span>
					<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30">
						{compensationModel === "chair_rental"
							? "Аренда кресла (Соло)"
							: compensationModel === "salary_plus_bonus"
								? `Оклад ${money(baseSalaryRub)} + ${commissionPct}%`
								: `Ставка ${commissionPct}%`}
					</span>
				</div>
				<div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
					<span className="text-xs text-[var(--muted,#64748b)]">
						{compensationModel === "chair_rental"
							? `Чистая выручка ${money(revenueRub)} - аренда ${money(fixedRentRub)} - ЗТЛ ${money(labDeductionsRub)}`
							: labDeductionsRub > 0
								? `Сдельная база за вычетом ЗТЛ: ${money(netBaseAfterLab)}`
								: "Чистая сдельная база (без ЗТЛ и материалов)"}
					</span>
					<span className="text-xl sm:text-2xl font-extrabold text-[var(--ink,#0f172a)]" data-testid="shift-close-calculated-payout">
						{money(calculatedPayoutRub)}
					</span>
				</div>
			</div>
		</div>
	);
};
