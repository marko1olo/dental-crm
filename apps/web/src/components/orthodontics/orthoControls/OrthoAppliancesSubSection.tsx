import React from "react";
import { OrthoBracketProtocolSection } from "../OrthoBracketProtocolSection";
import { OrthoArchwireSelector } from "../OrthoArchwireSelector";
import { OrthoClinicalActionsChecklist } from "../OrthoClinicalActionsChecklist";
import type { OrthoControlsColumnProps } from "./types";

export const OrthoAppliancesSubSection: React.FC<OrthoControlsColumnProps> = (props) => {
	return (
		<>
			<OrthoBracketProtocolSection
				bracketSlot={props.bracketSlot}
				setBracketSlot={props.setBracketSlot}
				bracketSystem={props.bracketSystem}
				onSelectBracketSystem={props.onSelectBracketSystem}
				plateActivationTurns={props.plateActivationTurns}
				setPlateActivationTurns={props.setPlateActivationTurns}
				onAddExpansionScrewAction={() => {
					if (!props.selectedActions.includes("expansion_screw_activation")) {
						props.setSelectedActions((prev) => [...prev, "expansion_screw_activation"]);
					}
				}}
				activeAttachmentPreset={props.activeAttachmentPreset}
				onSelectAttachmentPreset={props.onSelectAttachmentPreset}
				isSplitArchAligners={props.isSplitArchAligners}
				setIsSplitArchAligners={props.setIsSplitArchAligners}
				alignerStep={props.alignerStep}
				setAlignerStep={props.setAlignerStep}
				alignerTotal={props.alignerTotal}
				setAlignerTotal={props.setAlignerTotal}
				alignerStepUpper={props.alignerStepUpper}
				setAlignerStepUpper={props.setAlignerStepUpper}
				alignerTotalUpper={props.alignerTotalUpper}
				setAlignerTotalUpper={props.setAlignerTotalUpper}
				alignerStepLower={props.alignerStepLower}
				setAlignerStepLower={props.setAlignerStepLower}
				alignerTotalLower={props.alignerTotalLower}
				setAlignerTotalLower={props.setAlignerTotalLower}
				alignerIntervalDays={props.alignerDaysPerStep}
				setAlignerIntervalDays={props.setAlignerDaysPerStep}
				nextAlignerDateStr={props.nextAlignerDateStr}
				alignerProgressPercent={props.alignerProgressPercent}
				onSendAlignerReminder={props.onSendAlignerReminder}
				onIssueAlignerSet={props.onIssueAlignerSet}
				onApplyAttachmentsProtocol={props.onApplyAttachmentsProtocol}
				alignerSetIssuedCount={props.alignerSetIssuedCount}
			/>

			<OrthoArchwireSelector
				archwireMaterial={props.archwireMaterial}
				setArchwireMaterial={props.setArchwireMaterial}
				archwireSection={props.archwireSection}
				setArchwireSection={props.setArchwireSection}
				onSelectWorkhorseArchwire={props.onSelectWorkhorseArchwire}
				torquePreset={props.torquePreset}
				setTorquePreset={props.setTorquePreset}
				angulationPreset={props.angulationPreset}
				setAngulationPreset={props.setAngulationPreset}
				elasticScheme={props.elasticScheme}
				setElasticScheme={props.setElasticScheme}
				elasticSize={props.elasticSize}
				setElasticSize={props.setElasticSize}
				onElasticSizeInteraction={props.onElasticSizeInteraction}
			/>

			<OrthoClinicalActionsChecklist
				selectedActions={props.selectedActions}
				onToggleAction={props.onToggleAction}
			/>
		</>
	);
};
