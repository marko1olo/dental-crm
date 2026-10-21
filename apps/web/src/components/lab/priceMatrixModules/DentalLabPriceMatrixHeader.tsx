import React from "react";
import { Search, X } from "lucide-react";

export function DentalLabPriceMatrixHeader({
	searchQuery,
	setSearchQuery,
	categoryFilter,
	setCategoryFilter,
	onClose,
}: {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly categoryFilter: string;
	readonly setCategoryFilter: (c: string) => void;
	readonly onClose: () => void;
}) {
	return (
		<>
			<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
				<div>
					<h3 className="font-bold text-base text-[var(--ink)]">
						Прайс-лист зуботехнических работ (ЗТЛ)
					</h3>
					<p className="text-xs text-[var(--muted)]">
						Рекомендованные цены, себестоимость и клинические сроки
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="p-1 rounded-lg hover:bg-[var(--line)] transition"
				>
					<X size={18} />
				</button>
			</div>

			<div className="pt-3 pb-2 flex gap-2">
				<div className="relative flex-1">
					<Search
						size={14}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
					/>
					<input
						type="text"
						placeholder="Поиск конструкции или материала..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500"
					/>
				</div>
				<select
					value={categoryFilter}
					onChange={(e) => setCategoryFilter(e.target.value)}
					className="text-xs px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
				>
					<option value="all">Все категории</option>
					<option value="fixed">Несъемное протезирование</option>
					<option value="removable">Съемное протезирование</option>
					<option value="aligners">Элайнеры и каппы</option>
					<option value="implants">Шаблоны и импланты</option>
				</select>
			</div>
		</>
	);
}
