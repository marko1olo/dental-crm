import React from "react";
import type { AnesthesiaMethodSelectorProps, InjectionTechniqueId } from "./types";

interface TechniqueOption {
	readonly id: InjectionTechniqueId;
	readonly labelRu: string;
	readonly titleRu: string;
}

const PRIMARY_TECHNIQUES: readonly TechniqueOption[] = [
	{
		id: "infiltration",
		labelRu: "Инфильтрационная",
		titleRu: "Инфильтрационная наднадкостничная анестезия (депо в переходной складке)",
	},
	{
		id: "mandibular_torus",
		labelRu: "Проводниковая (мандибулярная/торусальная)",
		titleRu: "Проводниковая анестезия нижнечелюстного нерва (торусальная / мандибулярная)",
	},
	{
		id: "intraligamentary_sta",
		labelRu: "Интралигаментарная",
		titleRu: "Интралигаментарная анестезия в периодонтальную связку",
	},
	{
		id: "tuberal",
		labelRu: "Туберальная",
		titleRu: "Туберальная анестезия верхнечелюстного бугра (моляры верхней челюсти)",
	},
];

export function AnesthesiaMethodSelector({
	techniqueId,
	onSelectTechnique,
	targetToothNumberFdi,
	disabled = false,
}: AnesthesiaMethodSelectorProps) {
	return (
		<div
			className="flex items-center gap-1.5 flex-wrap py-1 text-xs"
			role="group"
			aria-label="Выбор методики анестезии"
		>
			<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider shrink-0 mr-1">
				Метод:
			</span>

			{PRIMARY_TECHNIQUES.map((tech) => {
				const isSelected = techniqueId === tech.id;
				return (
					<button
						key={tech.id}
						type="button"
						disabled={disabled}
						onClick={() => onSelectTechnique(tech.id)}
						className={`px-2.5 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-8.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer touch-manipulation active:scale-98 shadow-2xs ${
							isSelected
								? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-xs ring-1 ring-[var(--teal)]"
								: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)]"
						}`}
						title={tech.titleRu}
					>
						{tech.labelRu}
					</button>
				);
			})}

			{targetToothNumberFdi !== undefined && targetToothNumberFdi !== null && (
				<span
					className="ml-auto px-2.5 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-8.5 inline-flex items-center rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] shadow-2xs"
					title="Целевая анатомическая область по формуле FDI"
				>
					{`Зуб: ${targetToothNumberFdi}`}
				</span>
			)}
		</div>
	);
}
