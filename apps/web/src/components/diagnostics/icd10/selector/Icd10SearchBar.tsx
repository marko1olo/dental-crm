import React from "react";
import { Search, X } from "lucide-react";
import { ToothMolar } from "../../../icons/DentalIcons";

interface Icd10SearchBarProps {
	searchQuery: string;
	onSearchChange: (value: string) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	onClear: () => void;
	extractedToothNumber: number | null;
	autoFocus?: boolean | undefined;
	inputRef: React.RefObject<HTMLInputElement | null>;
}

export const Icd10SearchBar: React.FC<Icd10SearchBarProps> = ({
	searchQuery,
	onSearchChange,
	onKeyDown,
	onClear,
	extractedToothNumber,
	autoFocus,
	inputRef,
}) => {
	return (
		<div className="icd10-search-wrapper">
			<Search className="icd10-search-icon" size={20} aria-hidden="true" />

			{extractedToothNumber !== null && (
				<div className="icd10-detected-tooth-badge" title="Автоматически распознан номер зуба">
					<ToothMolar size={14} />
					Зуб {extractedToothNumber}
				</div>
			)}

			<input
				ref={inputRef}
				type="text"
				className="icd10-search-input"
				placeholder="Поиск по МКБ-10 (например: «пульпит 26», «кариес дентина», «K04.0», «адентия»)..."
				value={searchQuery}
				onChange={(e) => onSearchChange(e.target.value)}
				onKeyDown={onKeyDown}
				autoFocus={autoFocus}
				role="searchbox"
				aria-autocomplete="list"
				aria-controls="icd10-search-results-list"
			/>

			{searchQuery && (
				<button
					type="button"
					className="icd10-search-clear-btn"
					onClick={onClear}
					title="Очистить поиск"
					aria-label="Очистить поиск"
				>
					<X size={18} />
				</button>
			)}
		</div>
	);
};
