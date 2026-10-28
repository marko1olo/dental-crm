/**
 * PresenterDoctorDiscountBar.tsx — Панель скидок врача у кресла (Мандат 8e, 8b).
 * Автономия врача: скидки вплоть до 100% (гарантийный перелечивание) без ввода пароля начмеда.
 */

import React from "react";
import { Percent } from "lucide-react";
import { formatRubles } from "../treatmentPlanTypes";

export interface PresenterDoctorDiscountBarProps {
	readonly doctorDiscountPercent: number;
	readonly onDiscountChange: (percent: number) => void;
	readonly totalRub: number;
}

export const PresenterDoctorDiscountBar: React.FC<PresenterDoctorDiscountBarProps> = ({
	doctorDiscountPercent,
	onDiscountChange,
	totalRub,
}) => {
	return (
		<div className="p-3 sm:p-3.5 bg-[var(--paper)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
					<Percent className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span>Скидка врача:</span>
				</div>
				<div className="flex items-center gap-1 flex-wrap">
					{[0, 5, 10, 15, 100].map((pct) => (
						<button
							key={pct}
							type="button"
							onClick={() => onDiscountChange(pct)}
							className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
								doctorDiscountPercent === pct
									? "border-[var(--teal)] bg-[var(--teal)] text-[var(--paper-strong,#ffffff)]"
									: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)]"
							}`}
						>
							{pct === 100 ? "100% Гарантия" : `${pct}%`}
						</button>
					))}
				</div>
				<div className="flex items-center gap-1 ml-1">
					<input
						type="number"
						min={0}
						max={100}
						value={doctorDiscountPercent}
						onChange={(e) => {
							const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
							onDiscountChange(val);
						}}
						className="w-14 px-2 py-1 text-xs font-bold text-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
						aria-label="Процент скидки врача"
					/>
					<span className="font-bold text-[var(--muted)]">%</span>
				</div>
			</div>
			<div className="text-right ml-auto">
				<span className="text-[var(--muted)] mr-2">Сумма сметы:</span>
				<strong className="text-sm font-black text-[var(--ink)]">{formatRubles(totalRub)}</strong>
			</div>
		</div>
	);
};
