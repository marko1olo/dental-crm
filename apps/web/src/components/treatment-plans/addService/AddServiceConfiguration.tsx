import React from "react";
import type { TreatmentPlanStage } from "../types";
import { romanizeStageNumber } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { AddServiceToothSelector } from "./AddServiceToothSelector";

export interface AddServiceConfigurationProps {
	readonly item: CatalogServiceLookupItem;
	readonly stages: readonly TreatmentPlanStage[];
	readonly targetStageNumber: number;
	readonly onTargetStageChange: (stageNum: number) => void;
	readonly selectedTooth: number | null;
	readonly onSelectTooth: (tooth: number | null) => void;
	readonly quantity: number;
	readonly onQuantityChange: (qty: number) => void;
	readonly discountPercent: number;
	readonly onDiscountChange: (discount: number) => void;
}

export const AddServiceConfiguration: React.FC<AddServiceConfigurationProps> = ({
	item, stages, targetStageNumber, onTargetStageChange,
	selectedTooth, onSelectTooth, quantity, onQuantityChange,
	discountPercent, onDiscountChange,
}) => {
	const basePrice = item.basePriceRub || 0;
	const grossRub = basePrice * quantity;
	const discRub = Math.round((grossRub * discountPercent) / 100);
	const netRub = Math.max(0, grossRub - discRub);

	return (
		<div className="p-3.5 rounded-2xl bg-[var(--paper-strong)] border border-[var(--teal)]/40 space-y-3.5 shadow-xs">
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
				<div className="min-w-0">
					<div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Выбранная клиническая услуга:</div>
					<div className="font-bold text-xs text-[var(--ink)] break-words leading-snug mt-0.5">{item.title}</div>
				</div>
				<span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
					{basePrice.toLocaleString("ru-RU")} ₽ / ед.
				</span>
			</div>

			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<label className="text-[11px] font-bold text-[var(--muted)]">Назначить в этап плана:</label>
				<select
					value={targetStageNumber}
					onChange={(e) => onTargetStageChange(Number(e.target.value))}
					className="h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
					data-testid="target-stage-selector"
				>
					{stages.map((st) => (
						<option key={st.stageNumber} value={st.stageNumber}>
							Этап {romanizeStageNumber(st.stageNumber)}: {st.title}
						</option>
					))}
					{stages.length === 0 && <option value={1}>Этап I: Клинический этап</option>}
				</select>
			</div>

			<AddServiceToothSelector selectedTooth={selectedTooth} onSelectTooth={onSelectTooth} />

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
				<div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<span className="text-[11px] font-bold text-[var(--muted)]">Количество:</span>
					<div className="flex items-center gap-1.5">
						<button type="button" onClick={() => onQuantityChange(Math.max(1, quantity - 1))} className="w-9 h-9 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-sm font-bold flex items-center justify-center cursor-pointer hover:bg-[var(--line)] transition-colors active:scale-95">-</button>
						<span className="w-10 text-center font-mono font-bold text-sm">{quantity}</span>
						<button type="button" onClick={() => onQuantityChange(quantity + 1)} className="w-9 h-9 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-sm font-bold flex items-center justify-center cursor-pointer hover:bg-[var(--line)] transition-colors active:scale-95">+</button>
					</div>
				</div>

				<div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<span className="text-[11px] font-bold text-[var(--muted)]">Скидка врача:</span>
					<div className="flex items-center gap-1">
						{[0, 10, 50, 100].map((pct) => (
							<button key={pct} type="button" onClick={() => onDiscountChange(pct)} className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors ${discountPercent === pct ? "bg-[var(--teal)] text-white" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"}`}>{pct}%</button>
						))}
						<input type="number" min="0" max="100" value={discountPercent} onChange={(e) => onDiscountChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-12 h-9 text-center font-mono font-bold text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]" />
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold">
				<span className="text-emerald-800 dark:text-emerald-200">Итого к начислению в этап:</span>
				<div className="flex items-center gap-2">
					{discRub > 0 && <span className="text-[11px] text-[var(--muted)] line-through font-mono">{grossRub.toLocaleString("ru-RU")} ₽</span>}
					<span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">{netRub.toLocaleString("ru-RU")} ₽</span>
				</div>
			</div>
		</div>
	);
};
