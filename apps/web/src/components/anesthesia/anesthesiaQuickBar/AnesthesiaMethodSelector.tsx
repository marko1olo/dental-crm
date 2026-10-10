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
		labelRu: "Мандибулярная / торус.",
		titleRu: "Проводниковая анестезия нижнечелюстного нерва (торусальная / мандибулярная)",
	},
	{
		id: "tuberal",
		labelRu: "Туберальная",
		titleRu: "Туберальная анестезия верхнечелюстного бугра (моляры верхней челюсти)",
	},
	{
		id: "intraligamentary_sta",
		labelRu: "Интралигаментарная",
		titleRu: "Интралигаментарная анестезия в периодонтальную связку",
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
						className={`px-2.5 py-1.5 min-h-[44px] rounded-lg border text-xs font-semibold transition-all cursor-pointer touch-manipulation active:scale-98 ${
							isSelected
								? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-xs"
								: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
						}`}
						title={tech.titleRu}
					>
						{tech.labelRu}
					</button>
				);
			})}

			{targetToothNumberFdi !== undefined && targetToothNumberFdi !== null && (
				<span
					className="ml-auto px-2.5 py-1.5 min-h-[44px] inline-flex items-center rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
					title="Целевая анатомическая область по формуле FDI"
				>
					{`Зуб: ${targetToothNumberFdi}`}
				</span>
			)}
		</div>
	);
}
