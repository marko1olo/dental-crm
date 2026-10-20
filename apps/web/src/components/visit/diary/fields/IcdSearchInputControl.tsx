import React from "react";
import { Search, X } from "lucide-react";
import type { ICD10_DICTIONARY } from "../../../../lib/icd10";
import { IcdSearchDropdown } from "./IcdSearchDropdown";

export interface IcdSearchInputControlProps {
	readonly icdSearch: string;
	readonly fieldsDisabled: boolean;
	readonly showIcdDropdown: boolean;
	readonly filteredIcd: readonly (typeof ICD10_DICTIONARY)[number][];
	readonly onSearchChange: (val: string) => void;
	readonly onSearchFocus: () => void;
	readonly onClearSearch: () => void;
	readonly onCommitInput: () => void;
	readonly onSelectIcd: (code: string) => void;
}

export const IcdSearchInputControl: React.FC<IcdSearchInputControlProps> = ({
	icdSearch,
	fieldsDisabled,
	showIcdDropdown,
	filteredIcd,
	onSearchChange,
	onSearchFocus,
	onClearSearch,
	onCommitInput,
	onSelectIcd,
}) => {
	return (
		<div className="vde-043__icd-search-wrap">
			<Search className="w-4 h-4 vde-043__icd-search-icon" />
			<input
				id="diary-icd-search"
				disabled={fieldsDisabled}
				className="vde-043__input vde-043__icd-input min-h-[44px]"
				value={icdSearch}
				onChange={(e) => onSearchChange(e.target.value)}
				onFocus={onSearchFocus}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onCommitInput();
					}
				}}
				onBlur={() => {
					window.setTimeout(() => {
						onCommitInput();
					}, 120);
				}}
				placeholder="K02.1 Кариес... или введите название"
			/>
			{icdSearch && !fieldsDisabled && (
				<button
					type="button"
					onClick={onClearSearch}
					className="vde-043__icd-search-clear border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] rounded-md hover:border-[var(--teal)] transition-colors"
					aria-label="Очистить поиск диагноза"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
			{showIcdDropdown && (
				<IcdSearchDropdown filteredIcd={filteredIcd} onSelectIcd={onSelectIcd} />
			)}
		</div>
	);
};
