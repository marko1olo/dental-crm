import React from "react";
import { Plus, RotateCcw } from "lucide-react";
import { CASHBOX_AMOUNT_PRESETS } from "../cashboxConstants.js";

export interface CashboxAmountRowProps {
	readonly grossAmountRub: number;
	readonly setGrossAmountRub: (amount: number) => void;
	readonly onAddAmountPreset: (rub: number) => void;
}

export function CashboxAmountRow({
	grossAmountRub,
	setGrossAmountRub,
	onAddAmountPreset,
}: CashboxAmountRowProps): React.JSX.Element {
	return (
		<div className="mb-3 p-3 bg-[var(--paper-soft,#f8fafc)] rounded-lg border border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
			<div className="flex-1 min-w-[220px]">
				<label htmlFor="gross-amount-input" className="block text-xs font-semibold text-[var(--ink)] mb-1">
					Сумма к расчету (брутто):
				</label>
				<div className="relative">
					<input
						id="gross-amount-input"
						type="number"
						min="0"
						step="1"
						value={grossAmountRub || ""}
						onChange={(e) => {
							const val = parseFloat(e.target.value);
							setGrossAmountRub(Number.isNaN(val) ? 0 : Math.max(0, val));
						}}
						placeholder="Введите сумму в рублях"
						className="w-full text-base font-bold font-mono px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,var(--brand-primary))]"
						style={{ paddingRight: 44 }}
					/>
					<span className="absolute right-7 top-2 text-xs font-bold text-[var(--muted)] pointer-events-none">
						₽
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				{CASHBOX_AMOUNT_PRESETS.map((preset) => (
					<button
						key={preset}
						type="button"
						onClick={() => onAddAmountPreset(preset)}
						className="secondary-button text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1 min-h-[34px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						title={`Добавить +${preset.toLocaleString("ru-RU")} ₽`}
					>
						<Plus className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
						<span>{preset.toLocaleString("ru-RU")} ₽</span>
					</button>
				))}

				{grossAmountRub > 0 && (
					<button
						type="button"
						onClick={() => setGrossAmountRub(0)}
						className="secondary-button text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1 min-h-[34px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)]"
						title="Очистить сумму"
					>
						<RotateCcw className="w-3.5 h-3.5" />
						<span>Сброс</span>
					</button>
				)}
			</div>
		</div>
	);
}
