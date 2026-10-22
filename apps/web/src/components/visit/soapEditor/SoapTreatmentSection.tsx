import React from "react";
import type { VisitSoapNoteValues } from "./types";

export interface SoapTreatmentSectionProps {
	readonly values: VisitSoapNoteValues;
	readonly onFieldChange: (field: keyof VisitSoapNoteValues, val: string) => void;
	readonly onInputFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
	readonly onInputBlur: () => void;
}

export const SoapTreatmentSection: React.FC<SoapTreatmentSectionProps> = ({
	values,
	onFieldChange,
	onInputFocus,
	onInputBlur,
}) => {
	return (
		<>
			<div className="flex flex-col gap-1 md:col-span-2">
				<div className="flex items-center justify-between">
					<label htmlFor="soap-treatment" className="text-xs font-bold text-[var(--ink)]">
						Протокол лечения
					</label>
					<span className="text-[10px] text-[var(--muted)]">
						Анестезия, препарирование, пломба/коронка/удаление
					</span>
				</div>
				<textarea
					id="soap-treatment"
					rows={4}
					value={values.treatmentPlan || ""}
					onChange={(e) => onFieldChange("treatmentPlan", e.target.value)}
					onFocus={onInputFocus}
					onBlur={onInputBlur}
					placeholder="Анестезия sol. Articaini 1:200000 1.8 мл. Препарирование кариозной полости, коффердам..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y font-mono text-[11px] touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>

			<div className="flex flex-col gap-1 md:col-span-2">
				<label htmlFor="soap-recommendations" className="text-xs font-bold text-[var(--ink)]">
					Рекомендации и назначения
				</label>
				<textarea
					id="soap-recommendations"
					rows={2}
					value={values.recommendations || ""}
					onChange={(e) => onFieldChange("recommendations", e.target.value)}
					onFocus={onInputFocus}
					onBlur={onInputBlur}
					placeholder="Щадящая диета 2 часа, гигиена полости рта, НПВП при боли..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>
		</>
	);
};
