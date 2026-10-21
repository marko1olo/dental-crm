import type React from "react";

export interface AdultQuadrantsButtonsProps {
	readonly stampHint: string;
	readonly onGroupAction: (teeth: number[]) => void;
	readonly ADULT_Q1: number[];
	readonly ADULT_Q2: number[];
	readonly ADULT_Q3: number[];
	readonly ADULT_Q4: number[];
	readonly ADULT_FRONT: number[];
}

export const AdultQuadrantsButtons: React.FC<AdultQuadrantsButtonsProps> = ({
	stampHint,
	onGroupAction,
	ADULT_Q1,
	ADULT_Q2,
	ADULT_Q3,
	ADULT_Q4,
	ADULT_FRONT,
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
				onClick={(e) => closeAndAction(e, ADULT_Q1)}
				className={btnCls}
				title={`Q1 (18–11)${stampHint}`}
				data-testid="batch-select-q1-btn"
			>
				Q1
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_Q2)}
				className={btnCls}
				title={`Q2 (21–28)${stampHint}`}
				data-testid="batch-select-q2-btn"
			>
				Q2
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_Q3)}
				className={btnCls}
				title={`Q3 (31–38)${stampHint}`}
				data-testid="batch-select-q3-btn"
			>
				Q3
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_Q4)}
				className={btnCls}
				title={`Q4 (48–41)${stampHint}`}
				data-testid="batch-select-q4-btn"
			>
				Q4
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_FRONT)}
				className={frontCls}
				title={`Фронт (13–23, 43–33)${stampHint}`}
				data-testid="batch-select-front-btn"
			>
				Фронт
			</button>
		</>
	);
};
