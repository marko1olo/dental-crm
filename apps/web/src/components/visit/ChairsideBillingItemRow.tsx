/**
 * apps/web/src/components/visit/ChairsideBillingItemRow.tsx
 * Single item row in Chairside Service Billing list with inline price editing.
 */

import React, { useState } from "react";
import { Check, ShieldCheck, Trash2 } from "lucide-react";
import { getServiceBomMaterials, type ServiceBomMaterial } from "./chairsideBomMaterials.js";
import { ChairsideBomChips } from "./ChairsideBomChips.js";
import { ChairsidePriceEditor } from "./ChairsidePriceEditor.js";
import { ChairsideServiceHeader } from "./ChairsideServiceHeader.js";
import type { VisitBillingServiceItem } from "./visitBillingTypes.js";

export * from "./chairsideBomMaterials.js";

export interface ChairsideBillingItemRowProps {
	item: VisitBillingServiceItem;
	index: number;
	isWarranty100: boolean;
	readOnly?: boolean;
	onToggleWarranty: (id: string) => void;
	onQuantityChange: (id: string, delta: number) => void;
	onStepPrice: (id: string, delta: number) => void;
	onPriceChange: (id: string, newPrice: number) => void;
	onRemoveService: (id: string) => void;
	onStornoService?: (item: VisitBillingServiceItem, materials: ServiceBomMaterial[]) => void;
	onOpenMaterialDeduction?: (item: VisitBillingServiceItem) => void;
	hasOverdraftWarning?: boolean;
}

export const ChairsideBillingItemRow: React.FC<ChairsideBillingItemRowProps> = ({
	item, index, isWarranty100, readOnly = false, onToggleWarranty, onQuantityChange, onStepPrice,
	onPriceChange, onRemoveService, onStornoService, onOpenMaterialDeduction, hasOverdraftWarning = false,
}) => {
	const rowGrossRub = item.unitPriceRub * item.quantity;
	const isItemWarranty = item.isWarranty || isWarranty100;
	const rowDueRub = isItemWarranty ? 0 : rowGrossRub;
	const bomMaterials = getServiceBomMaterials(item.code804n, item.title, item.quantity);
	const showOverdraft = Boolean(hasOverdraftWarning || (item as any).isOverdraft || (item as any).hasOverdraft || bomMaterials.some((m) => m.isOverdraft));
	const [isCollapsing, setIsCollapsing] = useState(false);
	const [isFittingDone, setIsFittingDone] = useState(Boolean(item.fittingConfirmed));

	const handleRemove = () => {
		if (isCollapsing) return;
		setIsCollapsing(true);
		if (onStornoService) onStornoService(item, bomMaterials);
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-service-storno", {
				detail: { serviceId: item.id, serviceTitle: item.title, code804n: item.code804n, toothCode: item.toothCode, quantity: item.quantity, materials: bomMaterials, timestamp: new Date().toISOString() },
			}));
		}
		setTimeout(() => onRemoveService(item.id), 180);
	};

	return (
		<div
			className={`p-3 rounded-xl border transition-all ${isCollapsing ? "animate-collapse" : ""} ${isItemWarranty ? "border-emerald-500/30 bg-emerald-500/5" : "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]"}`}
			data-testid={`chairside-service-row-${item.id}`}
		>
			<div className="flex items-start justify-between gap-3 flex-wrap xl:flex-nowrap">
				<div className="min-w-0 flex-1 space-y-1">
					<ChairsideServiceHeader item={item} index={index} />
					<div className="flex items-center gap-2 pt-0.5 flex-wrap">
						<button
							type="button"
							onClick={() => onToggleWarranty(item.id)}
							title="Оформить по 100% гарантии (0 ₽)"
							className={`min-h-[28px] sm:h-7 px-2.5 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${item.isWarranty ? "bg-emerald-600 text-white shadow-2xs" : "bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-emerald-700 dark:text-emerald-300"}`}
							data-testid={`btn-warranty-toggle-${item.id}`}
						>
							<ShieldCheck size={12} />
							<span>{item.isWarranty ? "Гарантия 100% (0 ₽)" : "По гарантии"}</span>
						</button>
						{(item.labOrderNumber || item.code804n?.startsWith("A16.07.004")) && (
							<button
								type="button"
								onClick={() => setIsFittingDone((p) => !p)}
								className={`min-h-[28px] sm:h-7 px-2.5 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${isFittingDone ? "bg-emerald-600 text-white shadow-2xs" : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100"}`}
								data-testid={`chairside-confirm-fitting-btn-${item.id}`}
							>
								<Check size={12} />
								<span>{isFittingDone ? "✓ Примерка выполнена" : "Подтвердить примерку"}</span>
							</button>
						)}
						{item.labCostRub != null && item.labCostRub > 0 && (
							<span
								className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md"
								data-testid={`lab-cost-chip-${item.id}`}
								title="Себестоимость изготовления в зуботехнической лаборатории"
							>
								ЗТЛ: {item.labCostRub.toLocaleString("ru-RU")} ₽
							</span>
						)}
					</div>
					<ChairsideBomChips item={item} materials={bomMaterials} showOverdraft={showOverdraft} onOpenMaterialDeduction={onOpenMaterialDeduction} />
				</div>

				<div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0 self-end sm:self-auto">
					<ChairsidePriceEditor item={item} onQuantityChange={onQuantityChange} onStepPrice={onStepPrice} onPriceChange={onPriceChange} />
					<div className="w-20 sm:w-24 text-right">
						{item.isWarranty || isWarranty100 ? (
							<div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">0 ₽<div className="text-xs font-normal text-emerald-700 dark:text-emerald-500">Гарантия</div></div>
						) : <div className="text-xs font-bold font-mono text-[var(--ink,#0f172a)]">{rowDueRub.toLocaleString("ru-RU")} ₽</div>}
					</div>
					{!readOnly && (
						<button
							type="button"
							onClick={handleRemove}
							title="Удалить услугу из визита"
							className="w-7 h-7 rounded-lg text-[var(--muted,#64748b)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer transition-colors"
							data-testid={`btn-remove-service-${item.id}`}
						>
							<Trash2 size={14} />
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
