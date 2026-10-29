import React, { useState } from "react";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { VisitSoapNoteValues } from "./types";
import { ChairsideEndoQuickBar } from "../../endo/ChairsideEndoQuickBar";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export interface SoapTreatmentSectionProps {
	readonly values: VisitSoapNoteValues;
	readonly onFieldChange: (field: keyof VisitSoapNoteValues, val: string) => void;
	readonly onInputFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
	readonly onInputBlur: () => void;
	readonly selectedTooth?: number | null | undefined;
	readonly patientId?: string | undefined;
	readonly isLocked?: boolean | undefined;
}

export const SoapTreatmentSection: React.FC<SoapTreatmentSectionProps> = ({
	values,
	onFieldChange,
	onInputFocus,
	onInputBlur,
	selectedTooth,
	patientId,
	isLocked = false,
}) => {
	const isEndoDiagnosis = Boolean(
		values.diagnosis?.toLowerCase().includes("пульпит") ||
		values.diagnosis?.toLowerCase().includes("периодонтит") ||
		values.diagnosis?.toLowerCase().includes("эндо") ||
		values.diagnosis?.includes("K04")
	);
	const [showEndoBar, setShowEndoBar] = useState(isEndoDiagnosis);

	return (
		<>
			<div className="flex flex-col gap-1 md:col-span-2">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<label htmlFor="soap-treatment" className="text-xs font-bold text-[var(--ink)]">
						Протокол лечения
					</label>
					<div className="flex items-center gap-2">
						<SmartMicrophoneButton
							context="visit"
							title="Голосовая диктовка протокола лечения"
							onResult={(text) => onFieldChange("treatmentPlan", values.treatmentPlan ? `${values.treatmentPlan}\n${text}` : text)}
						/>
						<button
							type="button"
							onClick={() => setShowEndoBar((v) => !v)}
							data-testid="btn-toggle-soap-endo-bar"
							className={`secondary-button min-h-[28px] h-7 px-2.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
								showEndoBar
									? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
							title="1-клик протокол эндодонтии и каналов"
						>
							<Zap size={13} className={showEndoBar ? "text-rose-600" : "text-amber-500"} />
							<span>Эндодонтия (каналы)</span>
							{showEndoBar ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
						</button>
						<span className="text-[10px] text-[var(--muted)] hidden sm:inline">
							Анестезия, препарирование, каналы, пломба
						</span>
					</div>
				</div>

				{showEndoBar && (
					<div className="my-2" data-testid="soap-treatment-endo-wrapper">
						<ChairsideEndoQuickBar
							activeTooth={selectedTooth && selectedTooth > 0 ? selectedTooth : 16}
							toothState={values.diagnosis || "Пульпит"}
							patientId={patientId}
							isLocked={isLocked}
							onInsertToDiary={(soapText) => {
								const current = values.treatmentPlan || "";
								onFieldChange("treatmentPlan", current ? `${current}\n\n${soapText}` : soapText);
							}}
						/>
					</div>
				)}

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
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<label htmlFor="soap-recommendations" className="text-xs font-bold text-[var(--ink)]">
						Рекомендации и назначения
					</label>
					<SmartMicrophoneButton
						context="visit"
						title="Голосовая диктовка рекомендаций"
						onResult={(text) => onFieldChange("recommendations", values.recommendations ? `${values.recommendations} ${text}` : text)}
					/>
				</div>
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
