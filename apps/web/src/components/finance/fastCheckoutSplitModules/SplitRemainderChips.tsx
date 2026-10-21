import type React from "react";
import {
	SplitRemainderComboChips,
	type SplitRemainderComboChipsProps,
} from "./SplitRemainderComboChips";

export interface SplitRemainderChipsProps
	extends SplitRemainderComboChipsProps {
	readonly onAddRemainingToCard: () => void;
	readonly onAddRemainingToCash: () => void;
	readonly onAddRemainingToSbp: () => void;
	readonly onAddRemainingToDeposit: () => void;
}

export const SplitRemainderChips: React.FC<SplitRemainderChipsProps> = (
	props,
) => {
	const {
		remainingRub,
		onAddRemainingToCard,
		onAddRemainingToCash,
		onAddRemainingToSbp,
		onAddRemainingToDeposit,
	} = props;

	return (
		<div className="dente-filter-chips flex items-center gap-1.5 flex-wrap">
			<span className="text-[12px] text-[var(--muted,#64748b)] font-medium">
				Остаток{" "}
				<strong className="font-mono text-amber-600 dark:text-amber-400">
					{remainingRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</strong>
				:
			</span>
			<button
				type="button"
				onClick={onAddRemainingToCard}
				className="dente-filter-chip"
				title="Заполнить остаток картой"
				data-testid="split-fill-card-btn"
			>
				+ на Карту
			</button>
			<button
				type="button"
				onClick={onAddRemainingToCash}
				className="dente-filter-chip"
				title="Заполнить остаток наличными"
				data-testid="split-fill-cash-btn"
			>
				+ в Нал
			</button>
			<button
				type="button"
				onClick={onAddRemainingToSbp}
				className="dente-filter-chip"
				title="Заполнить остаток через СБП"
				data-testid="split-fill-sbp-btn"
			>
				+ в СБП
			</button>
			<button
				type="button"
				onClick={onAddRemainingToDeposit}
				className="dente-filter-chip"
				title="Заполнить остаток из депозита"
				data-testid="split-fill-deposit-btn"
			>
				+ в Депозит
			</button>

			<SplitRemainderComboChips {...props} />
		</div>
	);
};
