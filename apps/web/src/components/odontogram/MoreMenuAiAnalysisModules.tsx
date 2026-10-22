import React from "react";
import {
	AiAnalysisImagingButtons,
	type AiAnalysisImagingButtonsProps,
} from "./AiAnalysisImagingButtons";
import {
	AiAnalysisPediatricDiagnocatButtons,
	type AiAnalysisPediatricDiagnocatButtonsProps,
} from "./AiAnalysisPediatricDiagnocatButtons";

export interface MoreMenuAiAnalysisModulesProps
	extends AiAnalysisImagingButtonsProps,
		AiAnalysisPediatricDiagnocatButtonsProps {}

export const MoreMenuAiAnalysisModules: React.FC<
	MoreMenuAiAnalysisModulesProps
> = (props) => {
	return (
		<>
			<AiAnalysisImagingButtons
				isSmartOpgOpen={props.isSmartOpgOpen}
				setIsSmartOpgOpen={props.setIsSmartOpgOpen}
				isOrthoCephOpen={props.isOrthoCephOpen}
				setIsOrthoCephOpen={props.setIsOrthoCephOpen}
				onCloseMenu={props.onCloseMenu}
			/>
			<AiAnalysisPediatricDiagnocatButtons
				onOpenPediatricModal={props.onOpenPediatricModal}
				onLoadDiagnocat={props.onLoadDiagnocat}
				diagnocatLoading={props.diagnocatLoading}
				onCloseMenu={props.onCloseMenu}
			/>
		</>
	);
};
