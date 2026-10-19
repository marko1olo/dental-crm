import { Check, Clock } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { DentalLabPriceMatrixHeader } from "./priceMatrixModules/DentalLabPriceMatrixHeader";
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

	if (!isOpen) return null;

	const filteredItems = CANONICAL_LAB_PRICE_MATRIX.filter((item) => {
		const matchCat =
			categoryFilter === "all" || item.category === categoryFilter;
		const matchQuery =
			!searchQuery.trim() ||
			item.nameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.material.toLowerCase().includes(searchQuery.toLowerCase());
		return matchCat && matchQuery;
	});

	const modalContent = (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
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
								<span className="mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-600 text-white inline-flex items-center gap-1">
									<Check size={11} />
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
