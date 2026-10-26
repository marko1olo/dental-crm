/**
 * CbctMprGridWorkspaceRenderer.tsx — Маршрутизатор воркспейсов MPR сетки (Мандат 8b).
 */

import React from "react";
import type { CbctMprViewportsGridProps } from "./CbctMprGridProps";
import {
	EndoWorkspace,
	ImplantWorkspace,
	MprQuadWorkspace,
	PanoramicWorkspace,
	type ViewportRenderers,
} from "../workspaces";

export const CbctMprGridWorkspaceRenderer: React.FC<CbctMprViewportsGridProps> = (props) => {
	const {
		studioMode = "diagnostic",
		volume,
		archCurve,
		maximizedViewport,
		mobileActiveTab,
		patientDisplayName,
		activeCrossSection,
		activeCrossSectionIdx,
		crossSections,
		onChangeCrossSectionIdx,
		handleSelectTooth,
		selectedBrand,
		onSelectBrand,
		selectedDiameterMm,
		onSelectDiameterMm,
		selectedLengthMm,
		onSelectLengthMm,
		windowWidth,
		windowLevel,
	} = props;

	const renderers: ViewportRenderers = {
		axial: { baseRef: props.axialBaseCanvasRef, overlayRef: props.axialOverlayCanvasRef },
		coronal: { baseRef: props.coronalBaseCanvasRef, overlayRef: props.coronalOverlayCanvasRef },
		sagittal: { baseRef: props.sagittalBaseCanvasRef, overlayRef: props.sagittalOverlayCanvasRef },
		panoramic: { baseRef: props.panoBaseCanvasRef, overlayRef: props.panoOverlayCanvasRef },
		cross_section: { baseRef: props.crossSectionBaseCanvasRef, overlayRef: props.crossSectionOverlayCanvasRef },
	};

	const commonProps = {
		volume,
		archCurve,
		renderers,
		maximizedViewport,
		mobileActiveTab,
		patientDisplayName,
		activeCrossSection,
		activeCrossSectionIdx,
		crossSections,
		onChangeCrossSectionIdx,
		handleSelectTooth: handleSelectTooth ? (fdi: number) => handleSelectTooth(fdi) : undefined,
		selectedBrand,
		onSelectBrand,
		selectedDiameterMm,
		onSelectDiameterMm,
		selectedLengthMm,
		onSelectLengthMm,
		windowWidth,
		windowLevel,
	};

	if (studioMode === "panoramic") {
		return <PanoramicWorkspace {...commonProps} />;
	}
	if (studioMode === "endo") {
		return <EndoWorkspace {...commonProps} />;
	}
	if (studioMode === "implant") {
		return <ImplantWorkspace {...commonProps} />;
	}
	return <MprQuadWorkspace {...commonProps} />;
};
