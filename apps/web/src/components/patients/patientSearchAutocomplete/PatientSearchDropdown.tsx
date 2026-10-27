import type { Patient } from "@dental/shared";
import { UserPlus } from "lucide-react";
import React from "react";
import type { PatientSearchResultItem, PotentialDuplicateItem } from "../patientSearchFuzzy";
import type { QuickPatientPrefill } from "../../schedule/patientSearchEngine";
import { PatientSearchResultRow } from "./PatientSearchResultRow";
import type { SomaticBadgeInfo } from "./types";
import { PatientSearchDuplicateHint } from "./PatientSearchDuplicateHint";

interface PatientSearchDropdownProps {
	readonly listRef: React.RefObject<HTMLDivElement | null>;
	readonly searchResults: readonly PatientSearchResultItem[];
	readonly highlightedIndex: number;
	readonly canQuickCreate: boolean;
	readonly quickPrefill: QuickPatientPrefill;
	readonly potentialDuplicate: PotentialDuplicateItem | null;
	readonly getSomaticBadge: (p: Patient) => SomaticBadgeInfo | null;
	readonly onSelect: (patient: Patient) => void;
	readonly onHighlight: (index: number) => void;
	readonly onTriggerQuickCreate: () => void;
}

export function PatientSearchDropdown({
	listRef,
	searchResults,
	highlightedIndex,
	canQuickCreate,
	quickPrefill,
	potentialDuplicate,
	getSomaticBadge,
	onSelect,
	onHighlight,
	onTriggerQuickCreate,
}: PatientSearchDropdownProps) {
	return (
		<div
			ref={listRef as any}
			data-testid="patient-search-autocomplete-list"
			className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-[var(--paper-strong)] border border-[var(--glass-border)] shadow-xl overflow-hidden max-h-[360px] flex flex-col animate-in fade-in zoom-in-95 duration-100 text-xs text-[var(--ink)]"
		>
			{searchResults.length > 0 ? (
				<div className="overflow-y-auto p-1 divide-y divide-[var(--line)]/40 flex-1">
					{searchResults.map((item, index) => (
						<PatientSearchResultRow
							key={item.patient.id}
							item={item}
							isSelected={highlightedIndex === index}
							somaticBadge={getSomaticBadge(item.patient)}
							onSelect={onSelect}
							onMouseEnter={() => onHighlight(index)}
						/>
					))}
				</div>
			) : (
				<div className="p-3 text-center text-xs text-[var(--muted)]">
					Пациент с такими данными не найден
				</div>
			)}

			{canQuickCreate && (
				<div className="p-1.5 border-t border-[var(--glass-border)] bg-[var(--paper-soft)] shrink-0 flex flex-col gap-1.5">
					{potentialDuplicate && (
						<PatientSearchDuplicateHint
							potentialDuplicate={potentialDuplicate}
							onSelect={onSelect}
							onTriggerQuickCreate={onTriggerQuickCreate}
						/>
					)}

					<button
						type="button"
						data-testid="patient-search-quick-create-btn"
						onClick={onTriggerQuickCreate}
						onMouseEnter={() => onHighlight(searchResults.length)}
						className={`w-full min-h-[32px] h-8 px-3 py-1 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer select-none border ${
							highlightedIndex === searchResults.length
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
								: "bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30"
						}`}
					>
						<div className="flex items-center gap-1.5 truncate">
							<UserPlus size={14} className="shrink-0" />
							<span className="truncate">
								{quickPrefill.fullName ? `Создать «${quickPrefill.fullName}»` : "Создать нового пациента"} за 5 сек
							</span>
						</div>
						<span className="text-[10px] opacity-80 font-normal shrink-0">Без паспорта/СНИЛС</span>
					</button>
				</div>
			)}
		</div>
	);
}
