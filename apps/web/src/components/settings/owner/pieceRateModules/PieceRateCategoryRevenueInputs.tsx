/**
 * PieceRateCategoryRevenueInputs.tsx
 *
 * Ввод выручки и процентных ставок врача по направлениям (Терапия, Ортопедия, Хирургия, Гигиена).
 * Модуль декомпозирован согласно Мандату 8b (строго <= 120 строк).
 */

import React from "react";

export interface PieceRateCategoryRevenueInputsProps {
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
}

export const PieceRateCategoryRevenueInputs: React.FC<PieceRateCategoryRevenueInputsProps> = ({
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
}) => {
	const categories = [
		{ label: "Терапия:", rub: therapyRub, setRub: setTherapyRub, rate: therapyRatePct, setRate: setTherapyRatePct },
		{ label: "Ортопедия:", rub: orthopedicsRub, setRub: setOrthopedicsRub, rate: orthopedicsRatePct, setRate: setOrthopedicsRatePct },
		{ label: "Хирургия:", rub: surgeryRub, setRub: setSurgeryRub, rate: surgeryRatePct, setRate: setSurgeryRatePct },
		{ label: "Гигиена:", rub: hygieneRub, setRub: setHygieneRub, rate: hygieneRatePct, setRate: setHygieneRatePct },
	];

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
			<span className="text-xs font-bold text-[var(--ink)] block">
				Выручка и процентная ставка врача по направлениям:
			</span>

			{categories.map((c) => (
				<div key={c.label} className="grid grid-cols-12 gap-2 items-center">
					<span className="col-span-4 text-xs font-medium text-[var(--ink)]">{c.label}</span>
					<div className="col-span-5 relative">
						<input
							type="number"
							value={c.rub}
							onChange={(e) => c.setRub(Number(e.target.value) || 0)}
							className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
					</div>
					<div className="col-span-3 relative">
						<input
							type="number"
							value={c.rate}
							onChange={(e) => c.setRate(Number(e.target.value) || 0)}
							className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
					</div>
				</div>
			))}
		</div>
	);
};
