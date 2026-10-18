import React from "react";
import { Lock, Trash2 } from "lucide-react";
import type { TreatmentPlanItem } from "../types";
import { formatPlanPriceRub } from "../planPricing";
import { StageItemLabOrderButtons } from "./StageItemLabOrderButtons";

export interface StageItemActionsAndPriceProps {
	readonly item: TreatmentPlanItem;
	readonly isLabOrderEligible: boolean;
	readonly catalogPrice?: number | undefined;
	readonly itemUnitPrice: number;
	readonly hasPriceDrift: boolean;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
}

export const StageItemActionsAndPrice: React.FC<StageItemActionsAndPriceProps> = ({
	item,
	isLabOrderEligible,
	catalogPrice,
	itemUnitPrice,
	hasPriceDrift,
	onOpenLabOrder,
	onOneClickLabOrder,
	onUpdateItemQuantity,
	onRemoveItem,
}) => {
	return (
		<div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 flex-wrap sm:flex-nowrap">
			{isLabOrderEligible && (
				<StageItemLabOrderButtons
					item={item}
					onOpenLabOrder={onOpenLabOrder}
					onOneClickLabOrder={onOneClickLabOrder}
				/>
			)}

			{onUpdateItemQuantity ? (
				<div className="flex items-center border border-[var(--line,#e2e8f0)] rounded-lg bg-[var(--paper-soft,#f8fafc)] p-0.5">
					<button
						type="button"
						onClick={() => onUpdateItemQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
						className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#ffffff)] cursor-pointer text-xs font-bold transition-colors"
						title="Уменьшить количество"
						data-testid={`dec-qty-${item.id}`}
					>
						-
					</button>
					<span className="text-[11px] font-mono font-bold px-1.5 text-[var(--ink,#0f172a)] min-w-[18px] text-center">
						{item.quantity || 1}
					</span>
					<button
						type="button"
						onClick={() => onUpdateItemQuantity(item.id, (item.quantity || 1) + 1)}
						className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#ffffff)] cursor-pointer text-xs font-bold transition-colors"
						title="Увеличить количество"
						data-testid={`inc-qty-${item.id}`}
					>
						+
					</button>
				</div>
			) : (item.quantity || 1) > 1 ? (
				<span className="text-[11px] font-mono font-bold text-[var(--muted,#64748b)] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
					×{item.quantity}
				</span>
			) : null}

			<div className="text-right flex flex-col items-end gap-0.5">
				{hasPriceDrift && catalogPrice !== undefined && (
					<div
						className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
						data-testid={`price-drift-badge-${item.id}`}
						title="Цены утвержденного плана зафиксированы и не меняются при обновлении каталога"
					>
						<Lock size={10} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>
							В прайсе: {Math.round(catalogPrice).toLocaleString("ru-RU")} ₽ · В плане зафиксировано: {Math.round(itemUnitPrice).toLocaleString("ru-RU")} ₽
						</span>
					</div>
				)}

				<span
					className={`text-xs font-bold font-mono ${
						item.requiresManualPricing || (item.priceRub || 0) === 0
							? "text-amber-600 dark:text-amber-400"
							: "text-[var(--ink,#0f172a)]"
					}`}
				>
					{formatPlanPriceRub(item.priceRub)}
				</span>
				{(item.discountRub || 0) > 0 && (
					<div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
						Скидка: −{(item.discountRub || 0).toLocaleString("ru-RU")} ₽
					</div>
				)}
			</div>

			{onRemoveItem && (
				<button
					type="button"
					onClick={() => onRemoveItem(item.id)}
					className="h-7 w-7 min-h-[28px] min-w-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 flex items-center justify-center p-1 rounded-md text-[var(--muted,#64748b)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
					title={`Удалить процедуру «${item.name}» из этапа`}
					data-testid={`remove-item-${item.id}`}
				>
					<Trash2 size={13} />
				</button>
			)}
		</div>
	);
};
