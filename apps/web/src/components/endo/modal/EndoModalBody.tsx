import React from "react";
import type { EndoCanalData } from "@dental/shared";
import type { EndoStageStamp } from "../endoCanalConstants";
import { EndoQuickToolbar, type EndoQuickToolbarProps } from "../EndoQuickToolbar";
import { EndoCanalTable, type EndoCanalTableProps } from "../EndoCanalTable";
import { EndoClinicalParams } from "../EndoClinicalParams";

interface EndoModalBodyProps {
	readonly toolbarProps: EndoQuickToolbarProps;
	readonly tableProps: EndoCanalTableProps;
	readonly clinicalProps: {
		rotarySystem: string;
		setRotarySystem: (val: string) => void;
		irrigation: string;
		setIrrigation: (val: string) => void;
		radiologyControl: string;
		setRadiologyControl: (val: string) => void;
		generatedProtocolText: string;
		copied: boolean;
		handleCopyText: () => void;
	};
}

export const EndoModalBody: React.FC<EndoModalBodyProps> = ({
	toolbarProps,
	tableProps,
	clinicalProps,
}) => (
	<div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
		<EndoQuickToolbar {...toolbarProps} />
		<EndoCanalTable {...tableProps} />
		<EndoClinicalParams
			rotarySystem={clinicalProps.rotarySystem}
			setRotarySystem={clinicalProps.setRotarySystem}
			irrigation={clinicalProps.irrigation}
			setIrrigation={clinicalProps.setIrrigation}
			radiologyControl={clinicalProps.radiologyControl}
			setRadiologyControl={clinicalProps.setRadiologyControl}
			generatedProtocolText={clinicalProps.generatedProtocolText}
			copied={clinicalProps.copied}
			handleCopyText={clinicalProps.handleCopyText}
		/>
	</div>
);
