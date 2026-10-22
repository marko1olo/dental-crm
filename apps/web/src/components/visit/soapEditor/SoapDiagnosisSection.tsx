import { BookOpen, X } from "lucide-react";
import React from "react";
import { Icd10ClinicalSelector } from "../../diagnostics/Icd10ClinicalSelector";
import type { VisitSoapNoteValues } from "./types";

export interface SoapDiagnosisSectionProps {
	readonly values: VisitSoapNoteValues;
	readonly onFieldChange: (field: keyof VisitSoapNoteValues, val: string) => void;
	readonly onInputFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
	readonly onInputBlur: () => void;
	readonly selectedTooth: number | null;
	readonly isIcd10SelectorOpen: boolean;
	readonly onToggleIcd10Selector: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const SoapDiagnosisSection: React.FC<SoapDiagnosisSectionProps> = ({
	values,
	onFieldChange,
	onInputFocus,
	onInputBlur,
	selectedTooth,
	isIcd10SelectorOpen,
	onToggleIcd10Selector,
}) => {
	return (
		<div className="flex flex-col gap-1 md:col-span-2">
			<div className="flex items-center justify-between">
				<label htmlFor="soap-diagnosis" className="text-xs font-bold text-[var(--ink)]">
					Диагноз (МКБ-10)
				</label>
				<span className="text-[10px] text-[var(--teal,var(--brand-primary))] font-semibold">
					{values.icd10 || "МКБ-10"}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<input
					id="soap-icd10"
					type="text"
					value={values.icd10 || ""}
					onChange={(e) => onFieldChange("icd10", e.target.value)}
					onFocus={onInputFocus}
					onBlur={onInputBlur}
					placeholder="K02.1"
					aria-label="Код МКБ-10"
					className="w-24 min-h-[44px] sm:min-h-0 sm:h-8 px-2 text-xs font-bold text-[var(--teal,var(--brand-primary))] bg-[var(--paper)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)] touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
				<button
					type="button"
					onClick={() => onToggleIcd10Selector((prev) => !prev)}
					data-testid="btn-open-icd10-selector"
					className={`min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
						isIcd10SelectorOpen
							? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal,var(--brand-primary))]"
							: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))]"
					}`}
					title="Справочник диагнозов (K00–K14, шаблоны)"
				>
					<BookOpen className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span className="hidden sm:inline">Справочник</span>
				</button>
				<input
					id="soap-diagnosis"
					type="text"
					value={values.diagnosis || ""}
					onChange={(e) => onFieldChange("diagnosis", e.target.value)}
					onFocus={onInputFocus}
					onBlur={onInputBlur}
					placeholder="Клинический диагноз: Кариес дентина зуба 16..."
					className="flex-1 min-h-[44px] sm:min-h-0 sm:h-8 px-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)] touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>
			{isIcd10SelectorOpen && (
				<div className="mt-2 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg">
					<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
						<div className="flex items-center gap-2">
							<BookOpen className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							<span className="text-xs font-bold text-[var(--ink)]">
								Справочник диагнозов (Стоматология K00–K14)
							</span>
						</div>
						<button
							type="button"
							onClick={() => onToggleIcd10Selector(false)}
							className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg cursor-pointer flex items-center justify-center"
							aria-label="Закрыть справочник диагнозов"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
					<Icd10ClinicalSelector
						selectedCode={values.icd10}
						selectedTooth={selectedTooth}
						onSelect={(item, toothNumber) => {
							onFieldChange("icd10", item.code);
							const targetTooth = toothNumber ?? selectedTooth;
							const toothPart = targetTooth ? ` зуба ${targetTooth}` : "";
							onFieldChange("diagnosis", `${item.code} ${item.titleRu}${toothPart}`.trim());
							onToggleIcd10Selector(false);
						}}
						onClear={() => {
							onFieldChange("icd10", "");
							onToggleIcd10Selector(false);
						}}
					/>
				</div>
			)}
		</div>
	);
};
