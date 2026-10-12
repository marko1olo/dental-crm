/**
 * PieceRateInputsPanel.tsx
 *
 * Панель ввода выручки, процентных ставок и удержаний врача по направлениям.
 */

import React from "react";

export interface PieceRateInputsPanelProps {
	readonly therapyRub: number;
	readonly setTherapyRub: (val: number) => void;
	readonly therapyRatePct: number;
	readonly setTherapyRatePct: (val: number) => void;

	readonly orthopedicsRub: number;
	readonly setOrthopedicsRub: (val: number) => void;
	readonly orthopedicsRatePct: number;
	readonly setOrthopedicsRatePct: (val: number) => void;

	readonly surgeryRub: number;
	readonly setSurgeryRub: (val: number) => void;
	readonly surgeryRatePct: number;
	readonly setSurgeryRatePct: (val: number) => void;

	readonly hygieneRub: number;
	readonly setHygieneRub: (val: number) => void;
	readonly hygieneRatePct: number;
	readonly setHygieneRatePct: (val: number) => void;

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

export const PieceRateInputsPanel: React.FC<PieceRateInputsPanelProps> = ({
	therapyRub,
	setTherapyRub,
	therapyRatePct,
	setTherapyRatePct,
	orthopedicsRub,
	setOrthopedicsRub,
	orthopedicsRatePct,
	setOrthopedicsRatePct,
	surgeryRub,
	setSurgeryRub,
	surgeryRatePct,
	setSurgeryRatePct,
	hygieneRub,
	setHygieneRub,
	hygieneRatePct,
	setHygieneRatePct,
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
		<div className="space-y-4">
			{/* Выручка и процентная ставка врача по направлениям */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
				<span className="text-xs font-bold text-[var(--ink)] block">
					Выручка и процентная ставка врача по направлениям:
				</span>

				{/* Терапия */}
				<div className="grid grid-cols-12 gap-2 items-center">
					<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Терапия:</span>
					<div className="col-span-5 relative">
						<input
							type="number"
							value={therapyRub}
							onChange={(e) => setTherapyRub(Number(e.target.value) || 0)}
							className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
					</div>
					<div className="col-span-3 relative">
						<input
							type="number"
							value={therapyRatePct}
							onChange={(e) => setTherapyRatePct(Number(e.target.value) || 0)}
							className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
					</div>
				</div>

				{/* Ортопедия */}
				<div className="grid grid-cols-12 gap-2 items-center">
					<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Ортопедия:</span>
					<div className="col-span-5 relative">
						<input
							type="number"
							value={orthopedicsRub}
							onChange={(e) => setOrthopedicsRub(Number(e.target.value) || 0)}
							className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
					</div>
					<div className="col-span-3 relative">
						<input
							type="number"
							value={orthopedicsRatePct}
							onChange={(e) => setOrthopedicsRatePct(Number(e.target.value) || 0)}
							className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
					</div>
				</div>

				{/* Хирургия */}
				<div className="grid grid-cols-12 gap-2 items-center">
					<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Хирургия:</span>
					<div className="col-span-5 relative">
						<input
							type="number"
							value={surgeryRub}
							onChange={(e) => setSurgeryRub(Number(e.target.value) || 0)}
							className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
					</div>
					<div className="col-span-3 relative">
						<input
							type="number"
							value={surgeryRatePct}
							onChange={(e) => setSurgeryRatePct(Number(e.target.value) || 0)}
							className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
					</div>
				</div>

				{/* Гигиена */}
				<div className="grid grid-cols-12 gap-2 items-center">
					<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Гигиена:</span>
					<div className="col-span-5 relative">
						<input
							type="number"
							value={hygieneRub}
							onChange={(e) => setHygieneRub(Number(e.target.value) || 0)}
							className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
					</div>
					<div className="col-span-3 relative">
						<input
							type="number"
							value={hygieneRatePct}
							onChange={(e) => setHygieneRatePct(Number(e.target.value) || 0)}
							className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
					</div>
				</div>
			</div>

			{/* Удержания ЗТЛ и материалов */}
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
		</div>
	);
};
