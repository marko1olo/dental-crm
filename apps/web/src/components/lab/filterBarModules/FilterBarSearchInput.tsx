import React from "react";
import { Search, X } from "lucide-react";

export interface FilterBarSearchInputProps {
	searchQuery: string;
	setSearchQuery: (q: string) => void;
}

export function FilterBarSearchInput({
	searchQuery, setSearchQuery,
}: FilterBarSearchInputProps): React.JSX.Element {
	return (
		<div className="ztl-search-input-wrap">
			<Search size={14} className="ztl-search-icon" />
			<input
				type="text"
				className="ztl-search-input"
				placeholder="Поиск: номер наряда, пациент, врач, зуб, прием..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				style={{ paddingLeft: "38px" }}
			/>
			{searchQuery && (
				<button
					type="button"
					className="ztl-search-clear"
					onClick={() => setSearchQuery("")}
					aria-label="Очистить поиск"
				>
					<X size={12} />
				</button>
			)}
		</div>
	);
}
