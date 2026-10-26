import React from "react";
import type { ImplantWorkspaceProps } from "./modules/implant/implantWorkspaceTypes";
import { IMPLANT_PLATFORM_COLORS } from "./implant/implantCatalog";
import { useImplantWorkspaceState } from "./modules/implant/useImplantWorkspaceState";
import { ImplantWorkspaceTopBar } from "./modules/implant/ImplantWorkspaceTopBar";
import { ImplantWorkspaceViewportLayout } from "./modules/implant/ImplantWorkspaceViewportLayout";

export * from "./modules/implant/implantWorkspaceTypes";

export const ImplantWorkspace: React.FC<ImplantWorkspaceProps> = (props) => {
	const {
		renderers, maximizedViewport, mobileActiveTab, crossSections = [], activeCrossSectionIdx = 0,
		onChangeCrossSectionIdx, crossSectionStepMm = 2.0, onChangeCrossSectionStepMm,
		jawType = "mandible", handleSelectTooth, selectedBrand = "osstem", onSelectBrand,
		selectedDiameterMm = 4.0, onSelectDiameterMm, selectedLengthMm = 10.0, onSelectLengthMm,
		displayBoneClass = "D3", displayMeanHU = 480, displayTorque = "35 Н·см",
		displayNerveClearanceMm = 4.2, displayDrillingProtocol = "Сверление 800 об/мин",
		nerveSafetyStatus = "safe", handleExportToEmr, handleExportToPlan,
		windowWidth = 4025, windowLevel = 525, activeCrossSection,
	} = props;

	const state = useImplantWorkspaceState(props);

	if (maximizedViewport) {
		return (
			<div className="flex-1 flex min-h-0 min-w-0 w-full h-full" data-testid="cbct-implant-maximized-grid">
				{maximizedViewport === "axial" && renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "cross_section" && renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", true)}
				{maximizedViewport === "panoramic" && renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "coronal" && renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "sagittal" && renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
			</div>
		);
	}

	const isNerveDanger = nerveSafetyStatus === "danger" || (displayNerveClearanceMm !== null && displayNerveClearanceMm < 0.5);
	const isNerveWarning = !isNerveDanger && (nerveSafetyStatus === "warning" || (displayNerveClearanceMm !== null && displayNerveClearanceMm < 2.0));
	const platformColor = IMPLANT_PLATFORM_COLORS[selectedDiameterMm]?.hex ?? "#10b981";

	return (
		<div className="flex-1 flex flex-col min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-zinc-950" data-testid="cbct-workspace-implant-root">
			<ImplantWorkspaceTopBar
				selectedBrand={selectedBrand} selectedDiameterMm={selectedDiameterMm} selectedLengthMm={selectedLengthMm}
				platformColor={platformColor} viewMode={state.viewMode} setViewMode={state.setViewMode} crossSectionStepMm={crossSectionStepMm}
			/>
			<ImplantWorkspaceViewportLayout
				viewMode={state.viewMode} mobileActiveTab={mobileActiveTab} renderers={renderers} crossSections={crossSections}
				activeCrossSectionIdx={activeCrossSectionIdx} onChangeCrossSectionIdx={onChangeCrossSectionIdx}
				crossSectionStepMm={crossSectionStepMm} onChangeCrossSectionStepMm={onChangeCrossSectionStepMm}
				clinicalImplant={state.clinicalImplant} clinicalPose={state.clinicalPose} jawType={jawType}
				handleSelectTooth={handleSelectTooth} resolvedPatient={state.resolvedPatient} windowWidth={windowWidth}
				windowLevel={windowLevel}
				surgeonStationProps={{
					selectedBrand, onSelectBrand, clinicalImplant: state.clinicalImplant, selectedDiameterMm, onSelectDiameterMm,
					selectedLengthMm, onSelectLengthMm, platformColor, currentXOffsetMm: state.currentXOffsetMm, currentDepthMm: state.currentDepthMm,
					currentAngulationDeg: state.currentAngulationDeg, handleUpdateXOffset: state.handleUpdateXOffset,
					handleUpdateDepth: state.handleUpdateDepth, handleUpdateAngulation: state.handleUpdateAngulation,
					handleResetPose: state.handleResetPose, handleExportToPlan, handleExportToEmr, displayBoneClass,
					displayMeanHU, displayTorque, displayNerveClearanceMm, displayDrillingProtocol, isNerveDanger, isNerveWarning,
					ridgeWidths: state.ridgeWidths, edentulousTooth: state.edentulousTooth, setEdentulousTooth: state.setEdentulousTooth,
					activeCrossSection, isEditing043: state.isEditing043, setIsEditing043: state.setIsEditing043,
					edited043Text: state.edited043Text, setEdited043Text: state.setEdited043Text, edentulousData: state.edentulousData,
					resolvedPatient: state.resolvedPatient,
				}}
			/>
		</div>
	);
};
