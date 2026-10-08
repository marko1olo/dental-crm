import React from "react";
import {
	PEDIATRIC_TEETH_NAMES,
	QUICK_PEDIATRIC_TEETH,
} from "./constants";

export interface PediatricProtocolDetailsAccordionProps {
	readonly show: boolean;
	readonly currentTooth: number;
	readonly onSelectTooth: (tooth: number) => void;
	readonly fullProtocolText043: string;
}

export const PediatricProtocolDetailsAccordion: React.FC<
	PediatricProtocolDetailsAccordionProps
> = ({ show, currentTooth, onSelectTooth, fullProtocolText043 }) => {
	if (!show) return null;

	return (
		<div
			className="mb-4 space-y-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3.5"
			data-testid="pediatric-details-accordion-content"
		>
			{/* Быстрый выбор зуба */}
			<div>
				<div className="mb-1.5 block text-xs font-bold text-[var(--ink,#0f172a)]">
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
										? "bg-amber-600 text-white border-amber-600 shadow-xs scale-105"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
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
				<div className="mb-1 text-xs font-bold text-[var(--ink,#0f172a)]">
					Превью записи в медицинскую карту пациента (дневник приёма):
				</div>
				<pre className="max-h-48 overflow-y-auto rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 text-[11px] leading-relaxed text-[var(--ink,#0f172a)] font-mono whitespace-pre-wrap">
					{fullProtocolText043}
				</pre>
			</div>
		</div>
	);
};
