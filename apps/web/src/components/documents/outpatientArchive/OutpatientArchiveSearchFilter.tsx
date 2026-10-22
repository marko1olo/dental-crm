import React from "react";
import { Search, X } from "lucide-react";

interface OutpatientArchiveSearchFilterProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	statusFilter: "all" | "draft" | "issued" | "voided";
	setStatusFilter: (val: "all" | "draft" | "issued" | "voided") => void;
}

export const OutpatientArchiveSearchFilter: React.FC<OutpatientArchiveSearchFilterProps> = ({
	searchQuery,
	setSearchQuery,
	statusFilter,
	setStatusFilter,
}) => (
	<div className="archive-search-filter-row flex items-center justify-between gap-2.5 mb-3 flex-wrap">
		<div className="dente-search-wrap min-w-[240px] flex-1">
			<Search size={14} className="dente-search-icon" />
			<input
				type="text"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				placeholder="Поиск по архиву документов..."
				className="dente-search-input"
			/>
			{searchQuery && (
				<button
					type="button"
					onClick={() => setSearchQuery("")}
					className="dente-search-clear"
					aria-label="Очистить поиск"
				>
					<X size={13} />
				</button>
			)}
		</div>

		<div className="dente-segmented-bar">
			{(
				[
					{ id: "all", label: "Все" },
					{ id: "draft", label: "Черновики" },
					{ id: "issued", label: "Подписано / Выдано" },
				] as const
			).map((tab) => (
				<button
					key={tab.id}
					type="button"
					onClick={() => setStatusFilter(tab.id)}
					className={`dente-segmented-item ${statusFilter === tab.id ? "active" : ""}`}
					data-active={statusFilter === tab.id}
				>
					{tab.label}
				</button>
			))}
		</div>
	</div>
);
