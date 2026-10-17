import React from "react";
import { ChevronDown, ChevronUp, Droplet, PackagePlus, Receipt, ShieldAlert, Sparkles } from "lucide-react";
import { DentalCrown } from "../../icons/DentalIcons.js";
import { type ClinicalBundleCategory, type ClinicalBundleDefinition, type ClinicalBundleId, calculateBundlePrice } from "../treatmentPlanBundlesEngine";
import { BundleCompositionList } from "./BundleCompositionList";

export interface BundleCardItemProps {
	readonly bundle: ClinicalBundleDefinition;
	readonly selectedTooth: number;
	readonly selectedIds: readonly string[];
	readonly isExpanded: boolean;
	readonly isRecentlyAdded: boolean;
	readonly targetMode: "plan" | "invoice" | "both";
	readonly onToggleExpand: (bundleId: string) => void;
	readonly onApplyPlan: (bundle: ClinicalBundleDefinition) => void;
	readonly onApplyInvoice: (bundle: ClinicalBundleDefinition) => void;
	readonly onToggleItem: (bundleId: string, itemId: string) => void;
	readonly onResetSelection: (bundleId: ClinicalBundleId) => void;
}

const renderCategoryIcon = (cat: ClinicalBundleCategory) => {
	if (cat === "therapy") return <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
	if (cat === "surgery") return <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />;
	if (cat === "hygiene") return <Droplet size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />;
	if (cat === "orthopedics") return <DentalCrown size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />;
	return <PackagePlus size={16} className="text-[var(--teal,#0d9488)] shrink-0" />;
};

export const BundleCardItem: React.FC<BundleCardItemProps> = ({
	bundle, selectedTooth, selectedIds, isExpanded, isRecentlyAdded, targetMode,
	onToggleExpand, onApplyPlan, onApplyInvoice, onToggleItem, onResetSelection,
}) => {
	const breakdown = calculateBundlePrice(bundle.id, selectedIds as string[]);

	return (
		<div className={`rounded-2xl border transition-all ${isRecentlyAdded ? "border-emerald-500 shadow-md bg-emerald-50/20 dark:bg-emerald-950/20" : "border-[var(--line)] hover:border-[var(--teal)]/60 bg-[var(--paper-strong)] shadow-xs"}`} data-testid={`bundle-modal-card-${bundle.id}`}>
			<div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--line)]/60">
				<div className="space-y-1.5 flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						{renderCategoryIcon(bundle.category)}
						<h3 className="text-sm sm:text-base font-black text-[var(--ink)] tracking-tight break-words leading-snug">{bundle.title}</h3>
						<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">Этап {bundle.stageNumber}</span>
						{bundle.requiresTooth ? (
							<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--teal)]/10 text-[var(--teal-dark)] dark:text-teal-300 border border-[var(--teal)]/30 shrink-0">Зуб #{selectedTooth}</span>
						) : (
							<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">Вся полость рта</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted)] leading-snug break-words">{bundle.description}</p>
					<div className="flex items-center gap-2 pt-0.5 text-[11px] text-[var(--muted)] flex-wrap">
						<span className="font-semibold text-[var(--ink)]">{breakdown.selectedItems.length} из {bundle.items.length} поз. выбрано</span>
						{!breakdown.isFullySelected && <span className="text-amber-600 dark:text-amber-400 font-medium">(скорректировано врачом, -{breakdown.savingsRub.toLocaleString("ru-RU")} ₽)</span>}
					</div>
				</div>

				<div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--line)]/50">
					<div className="text-left md:text-right">
						<span className="text-[10px] text-[var(--muted)] block uppercase tracking-wider font-semibold">{breakdown.isFullySelected ? "Итого «Все включено»" : "Итого с учетом выбора"}</span>
						<div className="flex items-baseline md:justify-end gap-1.5">
							<strong className="text-base sm:text-lg font-black text-[var(--ink)] font-mono">{breakdown.totalRub.toLocaleString("ru-RU")} ₽</strong>
							{!breakdown.isFullySelected && <span className="text-[11px] line-through text-[var(--muted)] font-mono">{bundle.basePriceRub.toLocaleString("ru-RU")} ₽</span>}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button type="button" onClick={() => onToggleExpand(bundle.id)} className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-1 cursor-pointer" title="Настроить состав пакета" data-testid={`toggle-expand-${bundle.id}`}>
							<span>Состав</span>{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
						</button>
						{(targetMode === "both" || targetMode === "plan") && (
							<button type="button" onClick={() => onApplyPlan(bundle)} className="h-9 min-h-[36px] px-4 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95" title={`Добавить пакет в план${bundle.requiresTooth ? ` (зуб ${selectedTooth})` : ""}`} data-testid={`apply-plan-${bundle.id}`}>
								<PackagePlus size={15} /><span>В план</span>
							</button>
						)}
						{(targetMode === "both" || targetMode === "invoice") && (
							<button type="button" onClick={() => onApplyInvoice(bundle)} className="h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--teal)]/40 bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 text-[var(--teal-dark)] dark:text-teal-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95" title={`Выставить счет пациенту${bundle.requiresTooth ? ` (зуб ${selectedTooth})` : ""}`} data-testid={`apply-invoice-${bundle.id}`}>
								<Receipt size={15} /><span>В счет</span>
							</button>
						)}
					</div>
				</div>
			</div>

			{isExpanded && <BundleCompositionList bundle={bundle} selectedIds={selectedIds} onToggleItem={onToggleItem} onResetSelection={onResetSelection} />}
		</div>
	);
};
