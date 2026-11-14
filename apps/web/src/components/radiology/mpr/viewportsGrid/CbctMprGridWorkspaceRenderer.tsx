import React from "react";
import type { CbctMprViewportsGridProps } from "./CbctMprGridProps";
import {
	EndoWorkspace,
	ImplantWorkspace,
	MprQuadWorkspace,
	PanoramicWorkspace,
	type ViewportRenderers,
} from "../workspaces";
import { CbctVolume3DViewport } from "../CbctVolume3DViewport";
import type { CbctViewportType, MprPlane } from "../../cbctMprMath";

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
		viewLayout = "quad_view",
	} = props;

	const renderViewport = (
		type: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section",
		baseRef: React.RefObject<HTMLCanvasElement | null>,
		overlayRef: React.RefObject<HTMLCanvasElement | null>,
		borderClass: string,
		extraClassName = "flex-1 flex flex-col",
	) => {
		const isMpr = type === "axial" || type === "coronal" || type === "sagittal";
		const mprPlane: MprPlane | null = isMpr ? (type as MprPlane) : null;

		return (
			<div
				onDoubleClick={() => props.handleToggleMaximize(type)}
				onPointerDownCapture={() => props.setActiveViewport(type)}
				onMouseEnter={() => props.onHoverViewport?.(type)}
				onMouseLeave={() => props.onHoverViewport?.(null)}
				className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
					props.activeViewport === type
						? `ring-1 ring-cyan-500/50 border ${borderClass} shadow-lg`
						: `border border-zinc-800 hover:${borderClass}`
				} ${extraClassName}`}
				style={{ backgroundColor: "#000000" }}
				data-testid={`cbct-viewport-container-${type}`}
			>
				<div
					className="absolute inset-0 w-full h-full min-h-0 min-w-0 overflow-hidden"
					style={{ backgroundColor: "#000000" }}
				>
					<canvas
						ref={baseRef}
						style={{ backgroundColor: "#000000" }}
						className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
					/>
					<canvas
						ref={overlayRef}
						onDoubleClick={(e) => {
							if (mprPlane) props.handleCanvasDoubleClick(mprPlane, e);
						}}
						onMouseDown={(e) => {
							if (mprPlane) {
								props.handleCanvasMouseDown(mprPlane, e);
							} else if (type === "panoramic") {
								props.handlePanoMouseDown(e);
							} else if (type === "cross_section") {
								props.handleCrossSectionMouseDown(e);
							}
						}}
						onMouseMove={(e) => {
							if (mprPlane) {
								props.handleCanvasMouseMove(mprPlane, e);
							} else if (type === "panoramic") {
								props.handlePanoMouseMove(e);
							} else if (type === "cross_section") {
								props.handleCrossSectionMouseMove(e);
							}
						}}
						onMouseUp={() => {
							if (mprPlane) {
								props.handleCanvasMouseUp();
							} else if (type === "panoramic") {
								props.handlePanoMouseUp();
							} else if (type === "cross_section") {
								props.handleCrossSectionMouseUp();
							}
						}}
						onWheel={(e) => props.handleCanvasWheel(type as CbctViewportType, e)}
						style={{
							cursor: (mprPlane ? props.getCanvasCursor(mprPlane) : undefined) || "crosshair",
						}}
						className="absolute inset-0 w-full h-full object-contain z-10 touch-none"
					/>
					{props.renderViewportOverlays(type as CbctViewportType)}
				</div>
			</div>
		);
	};

	const renderers: ViewportRenderers = {
		renderAxial: (cls) =>
			renderViewport("axial", props.axialBaseCanvasRef, props.axialOverlayCanvasRef, "border-cyan-500", cls),
		renderCoronal: (cls) =>
			renderViewport("coronal", props.coronalBaseCanvasRef, props.coronalOverlayCanvasRef, "border-emerald-500", cls),
		renderSagittal: (cls) =>
			renderViewport("sagittal", props.sagittalBaseCanvasRef, props.sagittalOverlayCanvasRef, "border-rose-500", cls),
		renderPanoramic: (cls) =>
			renderViewport("panoramic", props.panoBaseCanvasRef, props.panoOverlayCanvasRef, "border-purple-500", cls),
		renderCrossSection: (cls) =>
			renderViewport(
				"cross_section",
				props.crossSectionBaseCanvasRef,
				props.crossSectionOverlayCanvasRef,
				"border-amber-500",
				cls,
			),
		renderVolume3D: (cls) => (
			<CbctVolume3DViewport
				volume={volume}
				extraClassName={cls}
				isActive={props.activeViewport === "panoramic"}
				onPointerDownCapture={() => props.setActiveViewport("panoramic")}
				onMouseEnter={() => props.onHoverViewport?.("panoramic")}
				onMouseLeave={() => props.onHoverViewport?.(null)}
				onDoubleClick={() => props.handleToggleMaximize("panoramic")}
				isMaximized={maximizedViewport === "panoramic"}
				onToggleMaximize={() => props.handleToggleMaximize("panoramic")}
				nervePoints={props.nervePoints}
				crosshairMm={props.crosshairMm}
			/>
		),
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
		handleSelectTooth: handleSelectTooth
			? (fdi: number | string) => handleSelectTooth(Number(fdi))
			: undefined,
		selectedBrand,
		onSelectBrand,
		selectedDiameterMm,
		onSelectDiameterMm,
		selectedLengthMm,
		onSelectLengthMm,
		windowWidth,
		windowLevel,
		viewLayout,
		activeViewport: props.activeViewport || "axial",
		setActiveViewport: props.setActiveViewport || (() => {}),
		handleToggleMaximize: props.handleToggleMaximize || (() => {}),
	};

	if (studioMode === "panoramic") return <PanoramicWorkspace {...commonProps} />;
	if (studioMode === "endo") return <EndoWorkspace {...commonProps} />;
	if (studioMode === "implant") return <ImplantWorkspace {...commonProps} />;
	return <MprQuadWorkspace {...commonProps} />;
};
