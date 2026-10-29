/**
 * apps/web/src/components/odontogram/MoreMenuAiAnalysisModules.tsx
 *
 * Facade adapter directing to consolidated AiAnalysisMenuButtons.
 * Conforms to Mandate 8b & Mandate 8ap.
 */

import React from "react";
import {
	AiAnalysisMenuButtons,
	type AiAnalysisMenuButtonsProps,
} from "./AiAnalysisMenuButtons";

export interface MoreMenuAiAnalysisModulesProps extends AiAnalysisMenuButtonsProps {
	readonly onLoadDiagnocat?: (() => void) | undefined;
	readonly diagnocatLoading?: boolean | undefined;
}

export const MoreMenuAiAnalysisModules: React.FC<
	MoreMenuAiAnalysisModulesProps
> = (props) => {
	const onLoadRadiologyAiReport =
		props.onLoadRadiologyAiReport ?? props.onLoadDiagnocat;
	const radiologyAiLoading =
		props.radiologyAiLoading ?? props.diagnocatLoading;

	return (
		<AiAnalysisMenuButtons
			isSmartOpgOpen={props.isSmartOpgOpen}
			setIsSmartOpgOpen={props.setIsSmartOpgOpen}
			isOrthoCephOpen={props.isOrthoCephOpen}
			setIsOrthoCephOpen={props.setIsOrthoCephOpen}
			onOpenPediatricModal={props.onOpenPediatricModal}
			onLoadRadiologyAiReport={onLoadRadiologyAiReport}
			radiologyAiLoading={radiologyAiLoading}
			onPrintOdontogramA4={props.onPrintOdontogramA4}
			onCloseMenu={props.onCloseMenu}
		/>
	);
};
