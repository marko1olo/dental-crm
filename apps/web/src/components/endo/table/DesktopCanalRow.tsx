import React from "react";
import type { EndoCanalData } from "@dental/shared";
import type { EndoStageStamp } from "../endoCanalTypes";
import { DesktopNameCell } from "./DesktopNameCell";
import { DesktopReferenceCell } from "./DesktopReferenceCell";
import { DesktopLengthCell } from "./DesktopLengthCell";
import { DesktopMafTaperCells } from "./DesktopMafTaperCells";
import { DesktopObturationCells } from "./DesktopObturationCells";

export interface DesktopCanalRowProps {
	readonly canal: EndoCanalData;
	readonly index: number;
	readonly suggestedCanalNames: string[];
	readonly stageStamp: EndoStageStamp;
	readonly handleCanalChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly handleAdjustCanalLength: (id: string, delta: number) => void;
	readonly handleCanalLengthInputChange: (id: string, val: string) => void;
	readonly handleSetCanalLength: (id: string, val: number) => void;
	readonly handleRemoveCanal: (id: string) => void;
	readonly renderIsoColorBadge: (mafOption: string) => React.ReactNode;
	readonly handleToggleCanalObliteration?: ((id: string) => void) | undefined;
}

export const DesktopCanalRow: React.FC<DesktopCanalRowProps> = ({
	canal,
	index,
	suggestedCanalNames,
	stageStamp,
	handleCanalChange,
	handleAdjustCanalLength,
	handleCanalLengthInputChange,
	handleSetCanalLength,
	handleRemoveCanal,
	renderIsoColorBadge,
	handleToggleCanalObliteration,
}) => (
	<tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
		<DesktopNameCell
			canal={canal}
			index={index}
			suggestedCanalNames={suggestedCanalNames}
			onChange={handleCanalChange}
			onToggleObliteration={handleToggleCanalObliteration}
		/>
		<DesktopReferenceCell
			canal={canal}
			onChange={handleCanalChange}
		/>
		<DesktopLengthCell
			canal={canal}
			onAdjustLength={handleAdjustCanalLength}
			onInputChange={handleCanalLengthInputChange}
			onSetLength={handleSetCanalLength}
			onToggleObliteration={handleToggleCanalObliteration}
		/>
		<DesktopMafTaperCells
			canal={canal}
			onChange={handleCanalChange}
			renderIsoColorBadge={renderIsoColorBadge}
		/>
		<DesktopObturationCells
			canal={canal}
			stageStamp={stageStamp}
			onChange={handleCanalChange}
			onRemove={handleRemoveCanal}
		/>
	</tr>
);
