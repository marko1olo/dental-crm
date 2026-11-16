import { Check, Clock } from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { DentalLabPriceMatrixHeader } from "./priceMatrixModules/DentalLabPriceMatrixHeader";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	CANONICAL_LAB_PRICE_MATRIX,
	type LabPriceMatrixItem,
} from "./priceMatrixModules/labPriceMatrixData";

export { CANONICAL_LAB_PRICE_MATRIX, type LabPriceMatrixItem };

export interface DentalLabPriceMatrixModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSelectWorkType?: (item: LabPriceMatrixItem) => void;
}

export function DentalLabPriceMatrixModal({
	isOpen,
	onClose,
	onSelectWorkType,
}: DentalLabPriceMatrixModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [matrixItems, setMatrixItems] = useState<readonly LabPriceMatrixItem[]>(CANONICAL_LAB_PRICE_MATRIX);

	useEffect(() => {
		if (!isOpen) return;
		let isCancelled = false;
		async function loadPresets() {
			try {
				const res = await fetch("/api/clinical/dental-lab/presets", { headers: denteAdminSecretRequestHeaders() });
				if (!res.ok) return;
				const data = (await res.json()) as { items?: LabPriceMatrixItem[]; presets?: Array<Record<string, unknown>> };
				const rawItems = Array.isArray(data?.items)
					? data.items
					: Array.isArray(data?.presets)
						? data.presets
						: null;
				if (rawItems && rawItems.length > 0 && !isCancelled) {
					const items: LabPriceMatrixItem[] = rawItems.map((p, idx) => {
						const cat = typeof p.category === "string" && ["crowns", "aesthetics", "removable", "aligners", "implants"].includes(p.category)
							? (p.category as LabPriceMatrixItem["category"])
							: "crowns";
						return {
							id: String(p.id || `preset_${idx}`),
							category: cat,
							categoryTitleRu: String(p.categoryTitleRu || "Коронки и конструкции"),
							nameRu: String(p.nameRu || "Ортопедическая конструкция"),
							shortTitle: String(p.shortTitle || p.nameRu || "Конструкция"),
							material: String(p.material || "Материал"),
							turnaroundBusinessDays: Number(p.turnaroundBusinessDays || 5),
							suggestedCostRub: Number(p.suggestedCostRub || 0),
							suggestedPriceRub: Number(p.suggestedPriceRub || 0),
							doctorDeductionPct: Number(p.doctorDeductionPct || 50),
							...(p.specialInstructions ? { specialInstructions: String(p.specialInstructions) } : {}),
						};
					});
					setMatrixItems(items);
				}
			} catch {
				// Fallback to CANONICAL_LAB_PRICE_MATRIX
			}
		}
		void loadPresets();
		return () => { isCancelled = true; };
	}, [isOpen]);

	if (!isOpen) return null;

	const filteredItems = matrixItems.filter((item) => {
		const matchCat =
			categoryFilter === "all" ||
			item.category === categoryFilter ||
			(categoryFilter === "fixed" && (item.category === "crowns" || item.category === "aesthetics"));
		const matchQuery =
			!searchQuery.trim() ||
			item.nameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.material.toLowerCase().includes(searchQuery.toLowerCase());
		return matchCat && matchQuery;
	});

	const modalContent = (
		<div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
			<div className="w-full max-w-2xl bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl p-5 flex flex-col max-h-[85vh]">
				<DentalLabPriceMatrixHeader
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					categoryFilter={categoryFilter}
					setCategoryFilter={setCategoryFilter}
					onClose={onClose}
				/>
				<div className="flex-1 overflow-y-auto py-2 space-y-2">
					{filteredItems.map((item) => (
						<button
							key={item.id}
							type="button"
							onClick={() => {
								onSelectWorkType?.(item);
								onClose();
							}}
							className="w-full text-left p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition cursor-pointer flex items-center justify-between gap-3"
						>
							<div className="min-w-0">
								<div className="font-bold text-xs text-[var(--ink)] truncate">
									{item.nameRu}
								</div>
								<div className="text-[11px] text-[var(--muted)] truncate">
									{item.material}
								</div>
								<div className="text-[10px] text-[var(--muted)] mt-0.5 flex items-center gap-1">
									<Clock size={11} />
									<span>Срок: {item.turnaroundBusinessDays} раб. дн.</span>
								</div>
							</div>
							<div className="text-right shrink-0">
								<div className="font-bold text-xs text-[var(--ink)]">
									{item.suggestedPriceRub.toLocaleString("ru-RU")} ₽
								</div>
								<div className="text-[10px] text-[var(--muted)]">
									ЗТЛ: {item.suggestedCostRub.toLocaleString("ru-RU")} ₽
								</div>
								<span className="mt-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-secondary)] inline-flex items-center gap-1 shadow-2xs">
									<Check size={11} className="text-[var(--teal)]" />
									<span>Выбрать</span>
								</span>
							</div>
						</button>
					))}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export default DentalLabPriceMatrixModal;
