import React, { useEffect, useMemo, useState } from "react";
import { PackagePlus } from "lucide-react";
import { showToast } from "../GlobalToast";
import { CLINICAL_BUNDLES, type ClinicalBundleCategory, type ClinicalBundleDefinition, type ClinicalBundleId, createBundleInvoiceItems, createBundlePlanItems, getClinicalBundleById } from "./treatmentPlanBundlesEngine";
import { BundleCardItem } from "./bundles/BundleCardItem";
import { BundleCategoryFilter } from "./bundles/BundleCategoryFilter";
import { BundleToothSelector } from "./bundles/BundleToothSelector";
import { BundlesModalHeader } from "./bundles/BundlesModalHeader";
import { BundlesModalFooter } from "./bundles/BundlesModalFooter";
import type { ClinicalServiceBundlesModalProps } from "./bundles/bundlesModalTypes";

export { type ClinicalServiceBundlesModalProps } from "./bundles/bundlesModalTypes";

export const ClinicalServiceBundlesModal: React.FC<ClinicalServiceBundlesModalProps> = ({
	isOpen, onClose, onApplyToPlan, onApplyToInvoice, initialToothNumber = 16, targetMode = "both",
}) => {
	const [selectedCategory, setSelectedCategory] = useState<ClinicalBundleCategory | "all">("all");
	const [selectedTooth, setSelectedTooth] = useState<number>(initialToothNumber);
	const [customToothInput, setCustomToothInput] = useState<string>(String(initialToothNumber));
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, string[]>>(() => {
		const m: Record<string, string[]> = {};
		for (const b of CLINICAL_BUNDLES) m[b.id] = b.items.map((it) => it.id);
		return m;
	});
	const [expandedBundleIds, setExpandedBundleIds] = useState<Record<string, boolean>>({});
	const [justAddedBundleId, setJustAddedBundleId] = useState<string | null>(null);

	useEffect(() => {
		if (initialToothNumber >= 11 && initialToothNumber <= 85) {
			setSelectedTooth(initialToothNumber);
			setCustomToothInput(String(initialToothNumber));
		}
	}, [initialToothNumber]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	const handleCustomToothChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value.replace(/\D/g, "").slice(0, 2);
		setCustomToothInput(val);
		const num = parseInt(val, 10);
		if (num >= 11 && num <= 85) setSelectedTooth(num);
	};

	const toggleItem = (bundleId: string, itemId: string) => setSelectedItemsMap((prev) => {
		const cur = prev[bundleId] ?? [];
		return { ...prev, [bundleId]: cur.includes(itemId) ? cur.filter((id) => id !== itemId) : [...cur, itemId] };
	});

	const resetBundle = (bundleId: ClinicalBundleId) => {
		const b = getClinicalBundleById(bundleId);
		if (b) setSelectedItemsMap((p) => ({ ...p, [bundleId]: b.items.map((it) => it.id) }));
	};

	const filteredBundles = useMemo(() => CLINICAL_BUNDLES.filter((b) => {
		if (selectedCategory !== "all" && b.category !== selectedCategory) return false;
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase().trim();
		return b.title.toLowerCase().includes(q) || b.shortTitle.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.items.some((it) => it.name.toLowerCase().includes(q) || it.code804n.toLowerCase().includes(q));
	}), [selectedCategory, searchQuery]);

	const handleApplyPlan = (b: ClinicalBundleDefinition) => {
		const items = createBundlePlanItems(b.id, { toothNumber: b.requiresTooth ? selectedTooth : undefined, selectedItemIds: selectedItemsMap[b.id] ?? b.items.map((it) => it.id) });
		if (!items.length) return showToast("Выберите хотя бы одну позицию из пакета", "warning");
		onApplyToPlan?.(items, b, b.requiresTooth ? selectedTooth : undefined);
		setJustAddedBundleId(b.id);
		setTimeout(() => setJustAddedBundleId(null), 2500);
		showToast(`Пакет «${b.shortTitle}» добавлен в план: ${items.reduce((s, it) => s + it.priceRub, 0).toLocaleString("ru-RU")} ₽!`, "success");
	};

	const handleApplyInvoice = (b: ClinicalBundleDefinition) => {
		const items = createBundleInvoiceItems(b.id, { toothNumber: b.requiresTooth ? selectedTooth : undefined, selectedItemIds: selectedItemsMap[b.id] ?? b.items.map((it) => it.id) });
		if (!items.length) return showToast("Выберите хотя бы одну позицию из пакета", "warning");
		onApplyToInvoice?.(items, b, b.requiresTooth ? selectedTooth : undefined);
		setJustAddedBundleId(b.id);
		setTimeout(() => setJustAddedBundleId(null), 2500);
		showToast(`Пакет «${b.shortTitle}» добавлен в счет: ${items.reduce((s, it) => s + it.priceRub, 0).toLocaleString("ru-RU")} ₽!`, "success");
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" data-testid="clinical-service-bundles-modal">
			<div className="relative w-full max-w-5xl rounded-2xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
