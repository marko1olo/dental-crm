import React from "react";
import { PackagePlus } from "lucide-react";
import { CLINICAL_BUNDLES } from "./treatmentPlanBundlesEngine";
import { BundleCardItem } from "./bundles/BundleCardItem";
import { BundleCategoryFilter } from "./bundles/BundleCategoryFilter";
import { BundleToothSelector } from "./bundles/BundleToothSelector";
import { BundlesModalHeader } from "./bundles/BundlesModalHeader";
import { BundlesModalFooter } from "./bundles/BundlesModalFooter";
import type { ClinicalServiceBundlesModalProps } from "./bundles/bundlesModalTypes";
import { useClinicalBundlesModalState } from "./bundles/useClinicalBundlesModalState";

export { type ClinicalServiceBundlesModalProps } from "./bundles/bundlesModalTypes";

export const ClinicalServiceBundlesModal: React.FC<ClinicalServiceBundlesModalProps> = (props) => {
	const { isOpen, onClose, targetMode = "both" } = props;
	const {
		selectedCategory,
		setSelectedCategory,
		selectedTooth,
		setSelectedTooth,
		customToothInput,
		setCustomToothInput,
		handleCustomToothChange,
		searchQuery,
		setSearchQuery,
		selectedItemsMap,
		toggleItem,
		resetBundle,
		expandedBundleIds,
		setExpandedBundleIds,
		justAddedBundleId,
		filteredBundles,
		handleApplyPlan,
		handleApplyInvoice,
	} = useClinicalBundlesModalState(props);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" data-testid="clinical-service-bundles-modal">
			<div className="relative w-full max-w-5xl rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
				<div className="sm:hidden flex justify-center pt-2.5 pb-1">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>
				<BundlesModalHeader onClose={onClose} />

				<div className="flex items-center justify-between gap-2.5 px-5 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex-wrap shrink-0">
					<BundleCategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} bundles={CLINICAL_BUNDLES} />
					<BundleToothSelector selectedTooth={selectedTooth} onToothChange={(t) => { setSelectedTooth(t); setCustomToothInput(String(t)); }} customToothInput={customToothInput} onCustomToothChange={handleCustomToothChange} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
				</div>

				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[var(--paper)]">
					{filteredBundles.length === 0 ? (
						<div className="py-12 px-4 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-2xl border border-[var(--line)] flex flex-col items-center justify-center gap-2">
							<PackagePlus size={28} className="text-[var(--muted)] opacity-50" /><span className="font-semibold text-sm text-[var(--ink)]">Пакеты не найдены по заданным критериям</span>
							<p className="text-xs max-w-sm">Попробуйте изменить поисковый запрос или сбросить фильтр категорий.</p>
							<button type="button" onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }} className="h-9 min-h-[36px] px-3.5 rounded-xl text-xs font-bold text-[var(--teal)] bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30 cursor-pointer transition-colors mt-2">Сбросить фильтры</button>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3.5">
							{filteredBundles.map((b) => (
								<BundleCardItem key={b.id} bundle={b} selectedTooth={selectedTooth} selectedIds={selectedItemsMap[b.id] ?? b.items.map((it) => it.id)} isExpanded={!!expandedBundleIds[b.id]} isRecentlyAdded={justAddedBundleId === b.id} targetMode={targetMode} onToggleExpand={(id) => setExpandedBundleIds((p) => ({ ...p, [id]: !p[id] }))} onApplyPlan={handleApplyPlan} onApplyInvoice={handleApplyInvoice} onToggleItem={toggleItem} onResetSelection={resetBundle} />
							))}
						</div>
					)}
				</div>

				<BundlesModalFooter onClose={onClose} />
			</div>
		</div>
	);
};
