import type React from "react";
import type { EndoCanalData } from "@dental/shared";
import type { EndoStageStamp } from "../endoCanalTypes";

export interface EndoCanalTableProps {
	readonly canals: EndoCanalData[];
	readonly suggestedCanalNames: string[];
	readonly stageStamp: EndoStageStamp;
	readonly handleCanalChange: (
		id: string,
		field: keyof EndoCanalData,
		value: any,
	) => void;
	readonly handleAdjustCanalLength: (id: string, delta: number) => void;
	readonly handleCanalLengthInputChange: (id: string, val: string) => void;
	readonly handleSetCanalLength: (id: string, val: number) => void;
	readonly handleRemoveCanal: (id: string) => void;
	readonly renderIsoColorBadge: (mafOption: string) => React.ReactNode;
	readonly handleToggleCanalObliteration?: (id: string) => void;
}
