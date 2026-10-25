import type { Patient } from "@dental/shared";
import { AlertTriangle, UserPlus } from "lucide-react";
import React from "react";
import type { PatientSearchResultItem, PotentialDuplicateItem } from "../patientSearchFuzzy";
import type { QuickPatientPrefill } from "../../schedule/patientSearchEngine";
import { PatientSearchResultRow } from "./PatientSearchResultRow";
import type { SomaticBadgeInfo } from "./types";

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
						<div
							data-testid="patient-search-duplicate-hint"
							className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col gap-1.5 text-amber-900 dark:text-amber-100 animate-in fade-in duration-100"
						>
							<div className="flex items-start gap-1.5">
								<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
								<div className="min-w-0 flex-1">
									<p className="font-bold m-0 leading-tight">
										Найден похожий пациент: {potentialDuplicate.patient.fullName}
										{potentialDuplicate.patient.phone ? ` (${potentialDuplicate.patient.phone})` : ""}
									</p>
									<p className="m-0 text-[11px] text-[var(--muted)] leading-tight">
										{potentialDuplicate.explanation || "Возможен повторный ввод уже существующей карты"}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 pt-0.5">
								<button
									type="button"
									data-testid="open-existing-patient-btn"
									onClick={() => onSelect(potentialDuplicate.patient)}
									className="h-6 px-2.5 rounded-md text-[11px] font-bold bg-[var(--teal)] text-white hover:bg-[var(--teal)]/90 cursor-pointer transition-colors shadow-xs"
								>
									Открыть существующего
								</button>
								<button
									type="button"
									data-testid="continue-quick-create-btn"
									onClick={onTriggerQuickCreate}
									className="h-6 px-2 rounded-md text-[11px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
								>
									Продолжить создание
								</button>
							</div>
						</div>
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
