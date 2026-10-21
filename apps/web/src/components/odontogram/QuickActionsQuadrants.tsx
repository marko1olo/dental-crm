import type React from "react";
import { AdultQuadrantsButtons } from "./AdultQuadrantsButtons";
import { PediatricQuadrantsButtons } from "./PediatricQuadrantsButtons";
import type { ToothState } from "./ToothChart";

export interface QuickActionsQuadrantsProps {
	readonly isPediatricEffective: boolean;
	readonly activeStampTool?: ToothState | null | undefined;
	readonly stampHint: string;
	readonly onGroupAction: (teeth: number[]) => void;
	readonly ADULT_Q1: number[];
	readonly ADULT_Q2: number[];
	readonly ADULT_Q3: number[];
	readonly ADULT_Q4: number[];
	readonly ADULT_FRONT: number[];
	readonly PEDIATRIC_Q5: number[];
	readonly PEDIATRIC_Q6: number[];
	readonly PEDIATRIC_Q7: number[];
	readonly PEDIATRIC_Q8: number[];
	readonly PEDIATRIC_FRONT: number[];
}

export const QuickActionsQuadrants: React.FC<QuickActionsQuadrantsProps> = ({
	isPediatricEffective,
	activeStampTool,
	stampHint,
	onGroupAction,
	ADULT_Q1,
	ADULT_Q2,
	ADULT_Q3,
	ADULT_Q4,
	ADULT_FRONT,
	PEDIATRIC_Q5,
	PEDIATRIC_Q6,
	PEDIATRIC_Q7,
	PEDIATRIC_Q8,
	PEDIATRIC_FRONT,
}) => {
	return (
		<div>
			<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none flex items-center justify-between">
				<span>Выбор квадрантов и фронта</span>
				{activeStampTool && (
					<span className="text-amber-600 dark:text-amber-400 font-bold normal-case text-2xs">
						штамп активен
					</span>
				)}
			</div>
			<div className="flex items-center gap-1">
				{isPediatricEffective ? (
					<PediatricQuadrantsButtons
						stampHint={stampHint}
						onGroupAction={onGroupAction}
						PEDIATRIC_Q5={PEDIATRIC_Q5}
						PEDIATRIC_Q6={PEDIATRIC_Q6}
						PEDIATRIC_Q7={PEDIATRIC_Q7}
						PEDIATRIC_Q8={PEDIATRIC_Q8}
						PEDIATRIC_FRONT={PEDIATRIC_FRONT}
					/>
				) : (
					<AdultQuadrantsButtons
						stampHint={stampHint}
						onGroupAction={onGroupAction}
						ADULT_Q1={ADULT_Q1}
						ADULT_Q2={ADULT_Q2}
						ADULT_Q3={ADULT_Q3}
						ADULT_Q4={ADULT_Q4}
						ADULT_FRONT={ADULT_FRONT}
					/>
				)}
			</div>
		</div>
	);
};
