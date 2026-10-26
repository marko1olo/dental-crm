import React, { type ChangeEvent, type RefObject } from "react";
import { Search, X } from "lucide-react";

export interface PatientsSearchInputProps {
	readonly query: string;
	readonly onQueryChange: (val: string) => void;
	readonly onClearQuery: () => void;
	readonly searchInputRef?: RefObject<HTMLInputElement | null> | undefined;
}

export const PatientsSearchInput: React.FC<PatientsSearchInputProps> = ({
	query,
	onQueryChange,
	onClearQuery,
	searchInputRef,
}) => {
	return (
		<div className="dente-search-wrap patients-search-box relative flex-1 max-w-[320px] min-w-[220px] flex items-center">
			<Search
				aria-hidden="true"
				className="dente-search-icon search-icon w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
			/>
			<input
				ref={searchInputRef}
				aria-label="Поиск пациента"
				type="search"
				autoComplete="off"
				className="dente-search-input !pl-[38px] !pr-9 h-9 min-h-[36px] w-full text-xs sm:text-[13px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
				value={query}
				onChange={(e: ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
				placeholder="ФИО или телефон..."
			/>
			{query ? (
				<button
					type="button"
					className="dente-search-clear patients-search-clear-btn absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 text-[var(--muted)] hover:text-[var(--ink)] rounded-full transition-colors cursor-pointer"
					onClick={onClearQuery}
					aria-label="Очистить поисковый запрос"
					title="Очистить"
				>
					<X size={14} aria-hidden="true" />
				</button>
			) : null}
		</div>
	);
};
