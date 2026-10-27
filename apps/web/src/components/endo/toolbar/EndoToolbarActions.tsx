import React from "react";
import { Check, Plus } from "lucide-react";

interface EndoToolbarActionsProps {
	readonly onApplyAnatomicalLengths: () => void;
	readonly onAddCanal: () => void;
}

export const EndoToolbarActions: React.FC<EndoToolbarActionsProps> = ({
	onApplyAnatomicalLengths,
	onAddCanal,
}) => (
	<div className="flex items-center gap-1.5 shrink-0">
		<button
			type="button"
			data-testid="btn-endo-anatomical-autofill"
			id="btn-endo-anatomical-norm"
			onClick={onApplyAnatomicalLengths}
			className="dente-btn dente-btn-secondary h-6 sm:h-7 px-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
			title="Автозаполнение: Анатомическая норма длины по стандарту FDI"
		>
			<Check
				size={13}
				className="text-[var(--teal)] shrink-0 font-bold"
			/>
			<span data-testid="btn-endo-anatomical-norm" className="hidden md:inline">Анатомическая норма длины</span>
			<span className="hidden sm:inline md:hidden">Норма длины</span>
			<span className="sm:hidden">Норма</span>
		</button>

		<button
			type="button"
			onClick={onAddCanal}
			className="dente-btn dente-btn-secondary h-6 sm:h-7 px-2 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
			title="Добавить дополнительный корневой канал"
		>
			<Plus size={13} className="text-[var(--ink-muted)] shrink-0" />
			<span className="hidden sm:inline">Канал</span>
		</button>
	</div>
);
