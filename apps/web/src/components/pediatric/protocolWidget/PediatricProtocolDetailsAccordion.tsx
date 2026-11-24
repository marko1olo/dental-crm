import React from "react";
import {
	PEDIATRIC_TEETH_NAMES,
	QUICK_PEDIATRIC_TEETH,
} from "./constants";

export interface PediatricProtocolDetailsAccordionProps {
	readonly show: boolean;
	readonly currentTooth: number;
	readonly onSelectTooth: (tooth: number) => void;
	readonly fullClinicalNoteText?: string | undefined;
}

export const PediatricProtocolDetailsAccordion: React.FC<
	PediatricProtocolDetailsAccordionProps
> = ({ show, currentTooth, onSelectTooth, fullClinicalNoteText }) => {
	if (!show) return null;

	const displayedText = fullClinicalNoteText || "";

	return (
		<div
			className="mb-4 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-3.5"
			data-testid="pediatric-details-accordion-content"
		>
			{/* Быстрый выбор зуба */}
			<div>
				<div className="mb-1.5 block text-xs font-bold text-[var(--ink)]">
					Быстро сменить зуб FDI (молочные моляры / резцы / постоянные 16,
					26, 36, 46):
				</div>
				<div className="flex flex-wrap gap-1.5">
					{QUICK_PEDIATRIC_TEETH.map((t) => {
						const isSelected = currentTooth === t;
						return (
							<button
								key={t}
								type="button"
								onClick={() => onSelectTooth(t)}
								className={`min-h-[48px] min-w-[48px] px-2.5 rounded-xl font-mono text-xs font-bold border transition cursor-pointer select-none flex items-center justify-center ${
									isSelected
										? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs scale-105"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`pediatric-tooth-chip-${t}`}
								title={`Зуб #${t} (${PEDIATRIC_TEETH_NAMES[t] ?? t})`}
							>
								{t}
							</button>
						);
					})}
				</div>
			</div>

			{/* Превью записи в медицинскую карту */}
			<div>
				<div className="mb-1 text-xs font-bold text-[var(--ink)]">
					Превью записи в медицинскую карту пациента (дневник приёма):
				</div>
				<pre className="max-h-48 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-[11px] leading-relaxed text-[var(--ink)] font-mono whitespace-pre-wrap">
					{displayedText}
				</pre>
			</div>
		</div>
	);
};
