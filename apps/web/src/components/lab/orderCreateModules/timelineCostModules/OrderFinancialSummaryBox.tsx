import React from "react";

export interface OrderFinancialSummaryBoxProps {
	toothCount: number;
	priceRub: number;
	onPriceRubChange: (price: number) => void;
	costRub: number;
	onCostRubChange: (cost: number) => void;
}

export function OrderFinancialSummaryBox({
	toothCount, priceRub, onPriceRubChange, costRub, onCostRubChange,
}: OrderFinancialSummaryBoxProps): React.JSX.Element {
	const count = Math.max(1, toothCount);
	const totalPrice = priceRub * count;
	const totalCost = costRub * count;
	const marginRub = totalPrice - totalCost;
	const marginPct = totalPrice > 0 ? Math.round((marginRub / totalPrice) * 100) : 0;

	return (
		<div className="p-3 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/60 space-y-2">
			<div className="text-[11px] font-semibold text-[var(--ink,#1e293b)] dark:text-slate-200 flex items-center justify-between">
				<span>Финансовый расчет наряда {count > 1 ? `(${count} ед.)` : ""}</span>
				<span className="text-teal-600 dark:text-teal-400 font-bold">
					Маржа: {marginRub.toLocaleString("ru-RU")} ₽ ({marginPct}%)
				</span>
			</div>

			<div className="ztl-form-grid-2">
				<div className="ztl-form-group mb-0">
					<label className="ztl-form-label text-[11px]" htmlFor="input-price-rub">
						Стоимость за ед. для пациента (₽)
					</label>
					<input
						id="input-price-rub"
						type="number"
						min={0}
						step={100}
						className="ztl-form-input w-full"
						value={priceRub}
						onChange={(e) => onPriceRubChange(Math.max(0, Number(e.target.value)))}
						data-testid="input-price-rub"
					/>
				</div>

				<div className="ztl-form-group mb-0">
					<label className="ztl-form-label text-[11px]" htmlFor="input-cost-rub">
						Себестоимость ЗТЛ за ед. (₽)
					</label>
					<input
						id="input-cost-rub"
						type="number"
						min={0}
						step={100}
						className="ztl-form-input w-full"
						value={costRub}
						onChange={(e) => onCostRubChange(Math.max(0, Number(e.target.value)))}
						data-testid="input-cost-rub"
					/>
				</div>
			</div>

			{count > 1 && (
				<div className="pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 flex justify-between">
					<span>Итого с пациента: <strong>{totalPrice.toLocaleString("ru-RU")} ₽</strong></span>
					<span>Оплата в ЗТЛ: <strong>{totalCost.toLocaleString("ru-RU")} ₽</strong></span>
				</div>
			)}
		</div>
	);
}
