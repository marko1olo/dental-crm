import React, { useState, useMemo, useEffect } from "react";
import { FolderPlus, Plus, X } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine";
import { DENTAL_SERVICES_CATALOG } from "./treatmentPlanServicesCatalog";
import { AddServiceCatalogList } from "./addService/AddServiceCatalogList";
import { AddServiceConfiguration } from "./addService/AddServiceConfiguration";
import type { TreatmentPlanAddServiceModalProps } from "./addService/addServiceTypes";

export { type TreatmentPlanAddServiceModalProps } from "./addService/addServiceTypes";

export const TreatmentPlanAddServiceModal: React.FC<TreatmentPlanAddServiceModalProps> = ({
	isOpen, onClose, stages, targetStage, catalog, onAddService,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [selectedItem, setSelectedItem] = useState<CatalogServiceLookupItem | null>(null);
	const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
	const [quantity, setQuantity] = useState(1);
	const [discountPercent, setDiscountPercent] = useState(0);
	const [targetStageNumber, setTargetStageNumber] = useState<number>(targetStage?.stageNumber ?? stages[0]?.stageNumber ?? 1);

	useEffect(() => {
		if (targetStage) setTargetStageNumber(targetStage.stageNumber);
		else if (stages.length > 0 && !stages.some((s) => s.stageNumber === targetStageNumber)) setTargetStageNumber(stages[0]!.stageNumber);
	}, [targetStage, stages]);

	const effectiveCatalog = useMemo<CatalogServiceLookupItem[]>(() => {
		if (Array.isArray(catalog) && catalog.length > 0) return catalog;
		return Object.values(DENTAL_SERVICES_CATALOG).map((p) => ({
			id: p.code, title: p.title, category: p.category, basePriceRub: p.defaultPriceRub,
			code: p.code, order804nCode: p.code, active: true,
		}));
	}, [catalog]);

	const availableCategories = useMemo(() => Array.from(new Set(effectiveCatalog.map((it) => it.category).filter(Boolean) as string[])).sort(), [effectiveCatalog]);

	const filteredServices = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return effectiveCatalog.filter((item) => {
			if (categoryFilter !== "all" && !(item.category || "").toLowerCase().includes(categoryFilter.toLowerCase())) return false;
			if (!q) return true;
			return (item.title || "").toLowerCase().includes(q) || (item.code || item.order804nCode || "").toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q);
		});
	}, [effectiveCatalog, searchQuery, categoryFilter]);

	const handleConfirm = () => {
		if (!selectedItem) return showToast("Выберите услугу из каталога", "warning");
		const basePrice = selectedItem.basePriceRub || 0;
		const qty = Math.max(1, quantity);
		const discRub = Math.round((basePrice * qty * Math.max(0, Math.min(100, discountPercent))) / 100);
		onAddService(targetStageNumber, {
			code804n: selectedItem.order804nCode || selectedItem.code || selectedItem.id,
			name: selectedItem.title, category: selectedItem.category || "Общее",
			...(selectedTooth ? { toothNumber: selectedTooth } : {}),
			quantity: qty, unitPriceRub: basePrice, discountRub: discRub,
		});
		onClose();
		setSelectedItem(null);
		setSelectedTooth(null);
		setQuantity(1);
		setDiscountPercent(0);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="add-service-modal-title" data-testid="add-service-from-catalog-modal">
			<div className="w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] rounded-3xl border border-[var(--line)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between p-4 border-b border-[var(--line)] bg-[var(--paper-strong)]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="p-2 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal)]/20 shrink-0"><FolderPlus size={18} /></div>
						<div className="min-w-0">
							<h3 id="add-service-modal-title" className="text-sm font-black text-[var(--ink)] tracking-tight break-words">Каталог клинических услуг</h3>
							<p className="text-[11px] text-[var(--muted)] leading-tight break-words mt-0.5">Прейскурант и клинические позиции для плана лечения</p>
						</div>
					</div>
					<button type="button" onClick={() => { onClose(); setSelectedItem(null); }} className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shrink-0" aria-label="Закрыть окно"><X size={18} /></button>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
					<AddServiceCatalogList searchQuery={searchQuery} onSearchChange={setSearchQuery} categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter} availableCategories={availableCategories} totalCatalogCount={effectiveCatalog.length} filteredServices={filteredServices} selectedCatalogItem={selectedItem} onSelectService={setSelectedItem} />
					{selectedItem && (
						<AddServiceConfiguration item={selectedItem} stages={stages} targetStageNumber={targetStageNumber} onTargetStageChange={setTargetStageNumber} selectedTooth={selectedTooth} onSelectTooth={setSelectedTooth} quantity={quantity} onQuantityChange={setQuantity} discountPercent={discountPercent} onDiscountChange={setDiscountPercent} />
					)}
				</div>

				<div className="p-4 border-t border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
					<button type="button" onClick={() => { onClose(); setSelectedItem(null); }} className="secondary-button min-h-[38px] px-4 font-semibold">Отмена</button>
					<button type="button" disabled={!selectedItem} onClick={handleConfirm} data-testid="confirm-add-service-to-stage-btn" className="primary-button min-h-[38px] px-5 font-bold">
						<Plus size={16} /><span>Добавить в этап</span>
					</button>
				</div>
			</div>
		</div>
	);
};
