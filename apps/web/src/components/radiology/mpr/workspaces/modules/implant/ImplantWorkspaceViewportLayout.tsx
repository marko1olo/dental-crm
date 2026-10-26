import React from "react";
import type { WorkspaceCommonProps } from "../../workspaceTypes";
import type { ClinicalImplantSpec, ClinicalImplantPose } from "../../implant/implantCatalog";
import { ImplantCrossSectionGrid } from "../../implant/ImplantCrossSectionGrid";
import { ImplantSurgeonStationPanel, type ImplantSurgeonStationPanelProps } from "./ImplantSurgeonStationPanel";

export interface ImplantWorkspaceViewportLayoutProps {
	readonly viewMode: "mpr_mode" | "pano_cross_mode" | "pano_grid_mode";
	readonly mobileActiveTab?: string | undefined;
	readonly renderers: WorkspaceCommonProps["renderers"];
	readonly crossSections?: WorkspaceCommonProps["crossSections"];
	readonly activeCrossSectionIdx?: number | undefined;
	readonly onChangeCrossSectionIdx?: ((idx: number) => void) | undefined;
	readonly crossSectionStepMm?: number | undefined;
	readonly onChangeCrossSectionStepMm?: ((step: number) => void) | undefined;
	readonly clinicalImplant: ClinicalImplantSpec;
	readonly clinicalPose: ClinicalImplantPose;
	readonly jawType?: string | undefined;
	readonly handleSelectTooth?: ((toothNumber: number) => void) | undefined;
	readonly resolvedPatient: string;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly surgeonStationProps: ImplantSurgeonStationPanelProps;
}

export const ImplantWorkspaceViewportLayout: React.FC<ImplantWorkspaceViewportLayoutProps> = (props) => {
	const {
		viewMode, mobileActiveTab, renderers, crossSections = [], activeCrossSectionIdx = 0,
		onChangeCrossSectionIdx, crossSectionStepMm = 2.0, onChangeCrossSectionStepMm,
		clinicalImplant, clinicalPose, jawType, handleSelectTooth, resolvedPatient,
		windowWidth = 4025, windowLevel = 525, surgeonStationProps,
	} = props;

	return (
		<div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-1 min-h-0" data-testid="cbct-mpr-quad-grid">
			{/* Top-Left Quadrant */}
			<div className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800 bg-black ${mobileActiveTab === "panoramic" ? "flex" : "hidden lg:flex"}`} data-testid="cbct-implant-top-left-viewport">
				{viewMode === "mpr_mode" ? renderers.renderAxial("flex-1 flex flex-col w-full h-full") : renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
			</div>

			{/* Top-Right Quadrant: CrossSectionGrid vs Single Cross vs Coronal */}
			<div className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800 bg-black ${mobileActiveTab === "axial" ? "flex" : "hidden lg:flex"}`} data-testid="cbct-implant-top-right-viewport">
				{viewMode === "pano_grid_mode" ? (
					<div className="flex-1 flex flex-col min-h-0 w-full h-full" data-testid="cbct-implant-cross-section-grid-container">
						<ImplantCrossSectionGrid
							crossSections={crossSections} activeCrossSectionIdx={activeCrossSectionIdx} onChangeCrossSectionIdx={onChangeCrossSectionIdx}
							crossSectionStepMm={crossSectionStepMm} onChangeCrossSectionStepMm={onChangeCrossSectionStepMm}
							selectedImplant={clinicalImplant} implantPose={clinicalPose} jawType={jawType} onSelectTooth={handleSelectTooth}
							patientDisplayName={resolvedPatient} windowWidth={windowWidth} windowLevel={windowLevel} gamma={1.50}
							airCutoffHU={-500} softKnee={false} slabThicknessMm={1.0} className="flex-1 w-full h-full"
						/>
					</div>
				) : viewMode === "pano_cross_mode" ? (
					renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", false)
				) : (
					renderers.renderCoronal("flex-1 flex flex-col w-full h-full")
				)}
			</div>

			{/* Bottom-Left Quadrant */}
			<div className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800 bg-black ${mobileActiveTab === "coronal" ? "flex" : "hidden lg:flex"}`} data-testid="cbct-implant-bottom-left-viewport">
				{viewMode === "mpr_mode" ? renderers.renderSagittal("flex-1 flex flex-col w-full h-full") : renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
			</div>

			{/* Bottom-Right Quadrant: Surgeon Planning Station */}
			<ImplantSurgeonStationPanel {...surgeonStationProps} />
		</div>
	);
};
