import { Search, X } from "lucide-react";
import React from "react";

interface PatientSearchInputProps {
	readonly inputRef: React.RefObject<HTMLInputElement | null>;
	readonly query: string;
	readonly placeholder: string;
	readonly autoFocus: boolean;
	readonly disabled: boolean;
	readonly onChangeQuery: (val: string) => void;
	readonly onClear: () => void;
	readonly onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	readonly onFocus: () => void;
}

export function PatientSearchInput({
	inputRef,
	query,
	placeholder,
	autoFocus,
	disabled,
	onChangeQuery,
	onClear,
	onKeyDown,
	onFocus,
}: PatientSearchInputProps) {
	return (
		<div className="dente-search-wrap">
			<Search size={14} className="dente-search-icon" aria-hidden="true" />
			<input
				ref={inputRef as any}
				type="text"
				value={query}
				autoFocus={autoFocus}
				disabled={disabled}
				onChange={(e) => onChangeQuery(e.target.value)}
				onFocus={onFocus}
				onKeyDown={onKeyDown}
				placeholder={placeholder}
				data-testid="patient-search-autocomplete-input"
				className="dente-search-input h-8 text-xs"
			/>
			{query && !disabled && (
				<button
					type="button"
					onClick={onClear}
					className="dente-search-clear"
					title="Очистить поиск"
					aria-label="Очистить поиск"
				>
					<X size={13} />
				</button>
			)}
		</div>
	);
}
