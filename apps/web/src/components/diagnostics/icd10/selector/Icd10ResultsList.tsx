import React from "react";
import { Check, ChevronRight, AlertCircle } from "lucide-react";
import { Icd10SeverityBadge } from "./Icd10SeverityBadge";
import type { DentalIcd10Item } from "../../icd10DentalCatalog";
import type { Icd10SearchResult } from "../../icd10MatchingEngine";

interface Icd10ResultsListProps {
	searchResults: readonly Icd10SearchResult[];
	selectedCode?: string | null | undefined;
	focusedIndex: number;
	searchQuery: string;
	onSelectDiagnosis: (item: DentalIcd10Item) => void;
	onHoverIndex: (index: number) => void;
	resultsListRef: React.RefObject<HTMLDivElement | null>;
}

export const Icd10ResultsList: React.FC<Icd10ResultsListProps> = ({
	searchResults,
	selectedCode,
	focusedIndex,
	searchQuery,
	onSelectDiagnosis,
	onHoverIndex,
	resultsListRef,
}) => {
	return (
		<div
			id="icd10-search-results-list"
			ref={resultsListRef}
			className="icd10-results-list"
			role="listbox"
			aria-label="Результаты поиска диагнозов"
		>
			{searchResults.length > 0 ? (
				searchResults.map((res, idx) => {
					const item = res.item;
					const isSelected = selectedCode === item.code;
					const isFocused = idx === focusedIndex;

					return (
						<div
							key={item.code}
							role="option"
							aria-selected={isSelected}
							className={`icd10-result-item ${isSelected ? "is-selected" : ""} ${isFocused ? "is-focused" : ""}`}
							onClick={() => onSelectDiagnosis(item)}
							onMouseEnter={() => onHoverIndex(idx)}
						>
							<div className="icd10-result-main min-w-0">
								<div className="icd10-result-header min-w-0">
									<span className="icd10-result-code shrink-0">{item.code}</span>
									<span className="icd10-result-title truncate min-w-0" title={item.titleRu}>{item.titleRu}</span>
									<Icd10SeverityBadge severity={item.severity} />
								</div>
								<div className="icd10-result-desc truncate min-w-0" title={item.description}>{item.description}</div>
							</div>
							{isSelected ? (
								<Check size={20} color="var(--teal)" className="shrink-0 ml-2" />
							) : (
								<ChevronRight size={18} color="var(--muted)" className="shrink-0 ml-2" />
							)}
						</div>
					);
				})
			) : (
				<div className="icd10-empty-state">
					<AlertCircle className="icd10-empty-icon" size={32} />
					<div className="icd10-empty-text">
						По запросу «{searchQuery}» стоматологических диагнозов не найдено.
					</div>
				</div>
			)}
		</div>
	);
};
