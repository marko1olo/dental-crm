/**
 * PieceRateDeductionInputs.tsx
 *
 * Ввод удержаний по ЗТЛ, материалам и гарантированного оклада за смены.
 * Модуль декомпозирован согласно Мандату 8b (строго <= 120 строк).
 */

import React from "react";

export interface PieceRateDeductionInputsProps {
	readonly labCostRub: number;
	readonly setLabCostRub: (val: number) => void;
	readonly labDeductionPct: number;
	readonly setLabDeductionPct: (val: number) => void;

	readonly materialCostRub: number;
	readonly setMaterialCostRub: (val: number) => void;
	readonly materialDeductionPct: number;
	readonly setMaterialDeductionPct: (val: number) => void;

	readonly baseSalaryRub: number;
	readonly setBaseSalaryRub: (val: number) => void;
}

export const PieceRateDeductionInputs: React.FC<PieceRateDeductionInputsProps> = ({
	labCostRub,
	setLabCostRub,
	labDeductionPct,
	setLabDeductionPct,
	materialCostRub,
	setMaterialCostRub,
	materialDeductionPct,
	setMaterialDeductionPct,
	baseSalaryRub,
	setBaseSalaryRub,
}) => {
	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
			<span className="text-xs font-bold text-[var(--ink)] block">
				Расходы и удержания с врача:
			</span>

			{/* Лаборатория ЗТЛ */}
			<div className="grid grid-cols-12 gap-2 items-center">
				<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Заказ-наряды ЗТЛ:</span>
				<div className="col-span-5 relative">
					<input
						type="number"
						value={labCostRub}
						onChange={(e) => setLabCostRub(Number(e.target.value) || 0)}
						className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					/>
					<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
				</div>
				<div className="col-span-3 relative">
					<input
						type="number"
						value={labDeductionPct}
						onChange={(e) => setLabDeductionPct(Number(e.target.value) || 0)}
						className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					/>
					<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">% вычет</span>
				</div>
			</div>

			{/* Материалы */}
			<div className="grid grid-cols-12 gap-2 items-center">
				<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Расходные материалы:</span>
				<div className="col-span-5 relative">
					<input
						type="number"
						value={materialCostRub}
						onChange={(e) => setMaterialCostRub(Number(e.target.value) || 0)}
						className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					/>
					<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
				</div>
				<div className="col-span-3 relative">
					<input
						type="number"
						value={materialDeductionPct}
						onChange={(e) => setMaterialDeductionPct(Number(e.target.value) || 0)}
						className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					/>
					<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">% вычет</span>
				</div>
			</div>

			{/* Гарантированный оклад */}
			<div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-[var(--line)]">
				<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Гарант за смены (оклад):</span>
				<div className="col-span-8 relative">
					<input
						type="number"
						value={baseSalaryRub}
						onChange={(e) => setBaseSalaryRub(Number(e.target.value) || 0)}
						placeholder="0 ₽"
						className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					/>
					<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
				</div>
			</div>
		</div>
	);
};
