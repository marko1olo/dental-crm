import React from "react";
import { Search, X } from "lucide-react";
import { ICD_GROUP_COLORS, type ICD10_DICTIONARY } from "../../../../lib/icd10";
import { IcdMobileBottomSheet } from "./IcdMobileBottomSheet";

export interface IcdSearchDropdownProps {
	readonly filteredIcd: readonly (typeof ICD10_DICTIONARY)[number][];
	readonly onSelectIcd: (code: string) => void;
}

export const IcdSearchDropdown: React.FC<IcdSearchDropdownProps> = ({
	filteredIcd,
	onSelectIcd,
}) => {
	if (!filteredIcd || filteredIcd.length === 0) return null;

	return (
		<div className="clinical-diary__icd-drop">
			{filteredIcd.map((icd) => (
				<div
					key={icd.code}
					className="clinical-diary__icd-opt min-h-[44px] min-w-0"
					role="option"
					aria-selected={false}
					tabIndex={0}
					onMouseDown={(e) => {
						e.preventDefault();
						onSelectIcd(icd.code);
					}}
				>
					<span
						className={`clinical-diary__icd-opt-code shrink-0 ${ICD_GROUP_COLORS[icd.group] ?? ""}`}
					>
						{icd.code}
					</span>
					<div className="flex-1 min-w-0 break-words">
						<div className="clinical-diary__icd-opt-label break-words whitespace-normal">
							{icd.label}
						</div>
						<div className="clinical-diary__icd-opt-group break-words">
							{icd.group}
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

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
		<div className="clinical-diary__icd-search-wrap">
			<Search className="w-4 h-4 clinical-diary__icd-search-icon" />
			<input
				id="diary-icd-search"
				data-testid="diary-icd-search"
				disabled={fieldsDisabled}
				className="clinical-diary__input clinical-diary__icd-input min-h-[44px]"
				value={icdSearch}
				onChange={(e) => onSearchChange(e.target.value)}
				onFocus={onSearchFocus}
				onClick={onSearchFocus}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onCommitInput();
					}
				}}
				placeholder="K02.1 Кариес... или введите название"
			/>
			{icdSearch && !fieldsDisabled && (
				<button
					type="button"
					onClick={onClearSearch}
					className="clinical-diary__icd-search-clear border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] rounded-md hover:border-[var(--teal)] transition-colors"
					aria-label="Очистить поиск диагноза"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
			{showIcdDropdown && (
				<>
					<div className="hidden sm:block">
						<IcdSearchDropdown filteredIcd={filteredIcd} onSelectIcd={onSelectIcd} />
					</div>
					<IcdMobileBottomSheet
						isOpen={showIcdDropdown}
						onClose={() => onClearSearch()}
						filteredIcd={filteredIcd}
						onSelectIcd={onSelectIcd}
						searchValue={icdSearch}
						onSearchChange={onSearchChange}
					/>
				</>
			)}
		</div>
	);
};
