import React from "react";
import { ANTERIOR_TEETH } from "./orthoProtocolTypes";
import { OrthoPhotoAndCephProtocolSection } from "./OrthoPhotoAndCephProtocolSection";
import { OrthoClinicalPresetsSection } from "./OrthoClinicalPresetsSection";
import { OrthoDiagnosticsSection } from "./OrthoDiagnosticsSection";
import { OrthoDentalArchSection } from "./OrthoDentalArchSection";
import { StagesToolbar } from "./orthoControls/StagesToolbar";
import { OrthoAppliancesSubSection } from "./orthoControls/OrthoAppliancesSubSection";
import type { OrthoControlsColumnProps } from "./orthoControls/types";

export type { OrthoControlsColumnProps };

export const OrthoControlsColumn: React.FC<OrthoControlsColumnProps> = (props) => {
	const { className = "" } = props;

	return (
		<div className={`lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-[var(--line)] overflow-y-auto ${className}`}>
			<StagesToolbar
				stageFilter={props.stageFilter}
				setStageFilter={props.setStageFilter}
				setBracketSystem={props.setBracketSystem}
				setArchwireMaterial={props.setArchwireMaterial}
				setArchwireSection={props.setArchwireSection}
				selectedActions={props.selectedActions}
				setSelectedActions={props.setSelectedActions}
			/>

			<OrthoPhotoAndCephProtocolSection
				isPhotoProtocolOpen={props.isPhotoProtocolOpen}
				setIsPhotoProtocolOpen={props.setIsPhotoProtocolOpen}
				isPhotoProtocolCompleted={props.isPhotoProtocolCompleted}
				onTogglePhotoProtocolCompleted={props.onTogglePhotoProtocolCompleted}
				isCephModalOpen={props.isCephModalOpen}
				setIsCephModalOpen={props.setIsCephModalOpen}
				anbClass={props.anbClass}
				setAnbClass={props.setAnbClass}
				anbAngle={props.anbAngle}
				setAnbAngle={props.setAnbAngle}
				onSetAnbNorm={props.onSetAnbNorm}
				patientId={props.patientId}
				patientName={props.patientName}
				doctorName={props.doctorName}
				clinicName={props.clinicName}
				onInsertCephToProtocol={props.onInsertCephToProtocol}
			/>

			<OrthoClinicalPresetsSection
				activePreset={props.activePreset}
				onPresetActivation={props.onPresetActivation}
				onPresetWireChange={props.onPresetWireChange}
				onPresetBonding={props.onPresetBonding}
				onPresetDebonding={props.onPresetDebonding}
				onPresetLeveling={props.onPresetLeveling}
				onPresetSprings={props.onPresetSprings}
				onPresetSeparationRings={props.onPresetSeparationRings}
				onPresetAlignerLabOrder={props.onPresetAlignerLabOrder}
				onPresetRetainerLabOrder={props.onPresetRetainerLabOrder}
				onPresetPlateLabOrder={props.onPresetPlateLabOrder}
				onPresetSplintLabOrder={props.onPresetSplintLabOrder}
				onPresetNiti014Activation={props.onPresetNiti014Activation}
				onPresetPowerChainChange={props.onPresetPowerChainChange}
				onPresetBondingBothMbt={props.onPresetBondingBothMbt}
				onPresetAlignerScan={props.onPresetAlignerScan}
				onPresetAlignerTrays1To4={props.onPresetAlignerTrays1To4}
				onPresetAlignerTrays5To8={props.onPresetAlignerTrays5To8}
				onPresetRebracket={props.onPresetRebracket}
				alignerStep={props.alignerStep}
				alignerTotal={props.alignerTotal}
			/>

			<OrthoDiagnosticsSection
				angleClass={props.angleClass}
				setAngleClass={props.setAngleClass}
				onSetAngleClassNorm={props.onSetAngleClassNorm}
				sagittalAnomaly={props.sagittalAnomaly}
				setSagittalAnomaly={props.setSagittalAnomaly}
				sagittalGapMm={props.sagittalGapMm}
				setSagittalGapMm={props.setSagittalGapMm}
				verticalAnomaly={props.verticalAnomaly}
				setVerticalAnomaly={props.setVerticalAnomaly}
				transversalAnomaly={props.transversalAnomaly}
				setTransversalAnomaly={props.setTransversalAnomaly}
				onSetOcclusionNorm={props.onSetOcclusionNorm}
				tmjStatus={props.tmjStatus}
				setTmjStatus={props.setTmjStatus}
				onSetTmjNorm={props.onSetTmjNorm}
			/>

			<OrthoDentalArchSection
				targetArch={props.targetArch}
				onSelectArch={props.onSelectArch}
				selectedTeeth={props.selectedTeeth}
				onToggleTooth={props.onToggleTooth}
				onSelectAnterior={() => props.setSelectedTeeth(ANTERIOR_TEETH)}
				onClearTeeth={() => props.setSelectedTeeth([])}
			/>

			<OrthoAppliancesSubSection {...props} />
		</div>
	);
};
