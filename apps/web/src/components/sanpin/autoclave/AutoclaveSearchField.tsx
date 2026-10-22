import { Search, X } from "lucide-react";
import type React from "react";

export interface AutoclaveSearchFieldProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
}

export const AutoclaveSearchField: React.FC<AutoclaveSearchFieldProps> = ({
	searchQuery,
	setSearchQuery,
}) => {
	return (
		<div className="dente-search-wrap flex-1 min-w-[120px] max-w-[240px]">
			<Search size={14} className="dente-search-icon" />
			<input
				type="text"
				placeholder="Поиск цикла"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				className="dente-search-input !h-8"
				data-testid="autoclave-search-input"
			/>
			{searchQuery && (
				<button
					type="button"
					className="dente-search-clear"
					onClick={() => setSearchQuery("")}
					aria-label="Очистить поиск"
				>
					<X size={12} />
				</button>
			)}
		</div>
	);
};
