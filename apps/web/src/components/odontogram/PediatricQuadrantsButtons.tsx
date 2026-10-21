import type React from "react";

export interface PediatricQuadrantsButtonsProps {
	readonly stampHint: string;
	readonly onGroupAction: (teeth: number[]) => void;
	readonly PEDIATRIC_Q5: number[];
	readonly PEDIATRIC_Q6: number[];
	readonly PEDIATRIC_Q7: number[];
	readonly PEDIATRIC_Q8: number[];
	readonly PEDIATRIC_FRONT: number[];
}

export const PediatricQuadrantsButtons: React.FC<
	PediatricQuadrantsButtonsProps
> = ({
	stampHint,
	onGroupAction,
	PEDIATRIC_Q5,
	PEDIATRIC_Q6,
	PEDIATRIC_Q7,
	PEDIATRIC_Q8,
	PEDIATRIC_FRONT,
}) => {
	const closeAndAction = (e: React.MouseEvent, teeth: number[]) => {
		const details = e.currentTarget.closest("details");
		if (details) details.open = false;
		onGroupAction(teeth);
	};

	const btnCls =
		"flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center";
	const frontCls =
		"flex-1 h-7 rounded text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 transition-all cursor-pointer select-none text-center";

	return (
		<>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_Q5)}
				className={btnCls}
				title={`Q5 (55–51)${stampHint}`}
				data-testid="batch-select-q5-btn"
			>
				Q5
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_Q6)}
				className={btnCls}
				title={`Q6 (61–65)${stampHint}`}
				data-testid="batch-select-q6-btn"
			>
				Q6
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_Q7)}
				className={btnCls}
				title={`Q7 (71–75)${stampHint}`}
				data-testid="batch-select-q7-btn"
			>
				Q7
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_Q8)}
				className={btnCls}
				title={`Q8 (85–81)${stampHint}`}
				data-testid="batch-select-q8-btn"
			>
				Q8
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_FRONT)}
				className={frontCls}
				title={`Фронт (53–63, 83–73)${stampHint}`}
				data-testid="batch-select-front-btn"
			>
				Фронт
			</button>
		</>
	);
};
