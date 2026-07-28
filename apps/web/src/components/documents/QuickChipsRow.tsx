/**
 * Ряд кнопок-подсказок под текстовым полем документа.
 *
 * В форме отказа от вмешательства этот ряд был выписан четыре раза целиком,
 * вместе с 200-символьным списком классов на каждой кнопке. Разметка перенесена
 * дословно, включая фокус-обводку и наведение: экран остаётся тем же.
 */
export interface QuickChipsRowProps {
	/** Готовые формулировки в порядке показа. */
	chips: readonly string[];
	/** Что делать с выбранной формулировкой — решает форма, а не ряд кнопок. */
	onPick: (chip: string) => void;
}

export function QuickChipsRow({ chips, onPick }: QuickChipsRowProps) {
	return (
		<div className="quick-chips-row flex-wrap">
			{chips.map((chip) => (
				<button
					key={chip}
					type="button"
					className="quick-chip quick-chip--sm focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] focus:outline-none transition-all hover:scale-[1.02]"
					onClick={() => onPick(chip)}
				>
					+ {chip}
				</button>
			))}
		</div>
	);
}
