import React from "react";
import { Search, X } from "lucide-react";

interface MobileDocumentsSearchProps {
	searchQuery: string;
	onSearchChange: (val: string) => void;
	onClear: () => void;
}

export function MobileDocumentsSearch({
	searchQuery,
	onSearchChange,
	onClear,
}: MobileDocumentsSearchProps) {
	return (
		<div className="px-4">
			<div className="relative flex items-center w-full">
				<Search
					size={16}
					className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
					aria-hidden="true"
				/>
				<input
					type="search"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск по документам и бланкам..."
					aria-label="Поиск по документам"
					className="mobile-doc-search-input"
					data-testid="mobile-documents-search-input"
				/>
				{searchQuery ? (
					<button
						type="button"
						onClick={onClear}
						className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
						aria-label="Очистить поиск"
					>
						<X size={16} aria-hidden="true" />
					</button>
				) : null}
			</div>
		</div>
	);
}
