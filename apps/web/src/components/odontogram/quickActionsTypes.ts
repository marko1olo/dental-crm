import type { ToothState } from "./ToothChart";

export interface OdontogramToolbarQuickActionsProps {
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	handleMarkIntactDentition: () => void;
	handleMarkWisdomTeethMissing: () => void;
	handleBatchSelectGroup: (teeth: number[]) => void;
	setActiveJawModalTarget: (target: "JU" | "JL" | "C") => void;
	pediatricMode?: boolean | undefined;
	isPediatricEffective: boolean;
	ADULT_Q1: number[];
	ADULT_Q2: number[];
	ADULT_Q3: number[];
	ADULT_Q4: number[];
	ADULT_FRONT: number[];
	PEDIATRIC_Q5: number[];
	PEDIATRIC_Q6: number[];
	PEDIATRIC_Q7: number[];
	PEDIATRIC_Q8: number[];
	PEDIATRIC_FRONT: number[];
	activeStampTool?: ToothState | null | undefined;
	selectedTeeth?: number[] | undefined;
	onInvertSelection?: (() => void) | undefined;
	onClearSelection?: (() => void) | undefined;
}
