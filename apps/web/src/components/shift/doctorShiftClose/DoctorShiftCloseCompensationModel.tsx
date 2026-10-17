import React from "react";
import { Calculator } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { DoctorShiftStats } from "../controlBarModules/shiftControlBarTypes";
import type { DoctorShiftCompensationModel } from "./doctorShiftCloseTypes";

export interface DoctorShiftCloseCompensationModelProps {
	readonly shiftStats: DoctorShiftStats;
	readonly compensationModel: DoctorShiftCompensationModel;
	readonly onSetCompensationModel: (model: DoctorShiftCompensationModel) => void;
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
			{/* Model Switcher Chips: [ Сдельщина (% от услуг) | Аренда кресла (фикс) | Оклад + % ] */}
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

			{/* Interactive parameter adjustments depending on model */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
				{compensationModel === "piece_rate" && (
					<>
						<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
							<span className="text-[var(--muted,#64748b)]">Вычет лаборатории ЗТЛ:</span>
							<div className="flex items-center gap-1">
								<input
									type="number"
									min="0"
									step="500"
									value={labDeductionsRub}
									onChange={(e) => onSetLabDeductionsRub(Number(e.target.value) || 0)}
									className="w-20 px-1.5 py-0.5 text-right font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded text-xs"
									aria-label="Вычет ЗТЛ"
								/>
								<span className="text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>
						<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
							<span className="text-[var(--muted,#64748b)]">Сдельная ставка врача:</span>
							<div className="flex items-center gap-1">
								<input
									type="number"
									min="0"
									max="100"
									step="1"
									value={commissionPct}
									onChange={(e) => onSetCommissionPct(Number(e.target.value) || 0)}
									className="w-14 px-1.5 py-0.5 text-right font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded text-xs"
									aria-label="Процентная ставка"
								/>
								<span className="text-[var(--muted,#64748b)]">%</span>
							</div>
						</div>
					</>
				)}

				{compensationModel === "chair_rental" && (
					<>
						<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
							<span className="text-[var(--muted,#64748b)]">Стоимость аренды смены:</span>
							<div className="flex items-center gap-1">
								<input
									type="number"
									min="0"
									step="500"
									value={fixedRentRub}
									onChange={(e) => onSetFixedRentRub(Number(e.target.value) || 0)}
									className="w-20 px-1.5 py-0.5 text-right font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded text-xs"
									aria-label="Фиксированная аренда смены"
								/>
								<span className="text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>
						<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
							<span className="text-[var(--muted,#64748b)]">Вычет ЗТЛ / материалов:</span>
							<div className="flex items-center gap-1">
								<input
									type="number"
									min="0"
									step="500"
									value={labDeductionsRub}
									onChange={(e) => onSetLabDeductionsRub(Number(e.target.value) || 0)}
									className="w-20 px-1.5 py-0.5 text-right font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded text-xs"
									aria-label="Вычет ЗТЛ и материалов"
								/>
								<span className="text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>
					</>
				)}

				{compensationModel === "salary_plus_bonus" && (
					<>
						<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
							<span className="text-[var(--muted,#64748b)]">Оклад за выход:</span>
							<div className="flex items-center gap-1">
								<input
									type="number"
									min="0"
									step="500"
									value={baseSalaryRub}
									onChange={(e) => onSetBaseSalaryRub(Number(e.target.value) || 0)}
									className="w-20 px-1.5 py-0.5 text-right font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded text-xs"
									aria-label="Базовый оклад за выход"
								/>
								<span className="text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>
						<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
							<span className="text-[var(--muted,#64748b)]">Бонус от услуг:</span>
							<div className="flex items-center gap-1">
								<input
									type="number"
									min="0"
									max="100"
									step="1"
									value={commissionPct}
									onChange={(e) => onSetCommissionPct(Number(e.target.value) || 0)}
									className="w-14 px-1.5 py-0.5 text-right font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded text-xs"
									aria-label="Процент бонуса"
								/>
								<span className="text-[var(--muted,#64748b)]">%</span>
							</div>
						</div>
					</>
				)}
			</div>

			{/* Total Earnings Showcase Card */}
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
					<span
						className="text-xl sm:text-2xl font-extrabold text-[var(--ink,#0f172a)]"
						data-testid="shift-close-calculated-payout"
					>
						{money(calculatedPayoutRub)}
					</span>
				</div>
			</div>
		</div>
	);
};
