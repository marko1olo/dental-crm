import React from "react";
import { DirectRvgFooter } from "../DirectRvgFooter";
import type { DirectRvgFooterActionsProps } from "./types";

export const DirectRvgFooterActions: React.FC<DirectRvgFooterActionsProps> = ({
	selectedTeeth,
	calculatedDoseMicrosv,
	isSaving,
	onExportDicom,
	onSendToLab,
	onSaveToEmr,
	onSendToPlan,
	onRetake,
}) => {
	return (
		<DirectRvgFooter
			selectedTeeth={selectedTeeth}
			calculatedDoseMicrosv={calculatedDoseMicrosv}
			isSaving={isSaving}
			onExportDicom={onExportDicom}
			onSendToLab={onSendToLab}
			onSaveToEmr={onSaveToEmr}
			onSendToPlan={onSendToPlan}
			onRetake={onRetake}
		/>
	);
};

export default DirectRvgFooterActions;
