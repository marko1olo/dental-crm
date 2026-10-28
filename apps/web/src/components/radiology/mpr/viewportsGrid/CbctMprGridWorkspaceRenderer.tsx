import React from "react";
import type { CbctMprViewportsGridProps } from "./CbctMprGridProps";
import { EndoWorkspace, ImplantWorkspace, MprQuadWorkspace, PanoramicWorkspace, type ViewportRenderers } from "../workspaces";
import { CbctVolume3DViewport } from "../CbctVolume3DViewport";

export const CbctMprGridWorkspaceRenderer: React.FC<CbctMprViewportsGridProps> = (props) => {
	const {
		studioMode = "diagnostic", volume, archCurve, maximizedViewport, mobileActiveTab,
		patientDisplayName, activeCrossSection, activeCrossSectionIdx, crossSections,
		onChangeCrossSectionIdx, handleSelectTooth, selectedBrand, onSelectBrand,
		selectedDiameterMm, onSelectDiameterMm, selectedLengthMm, onSelectLengthMm,
		windowWidth, windowLevel, viewLayout = "quad_view",
	} = props;

	const renderViewport = (
		type: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section",
		baseRef: any, overlayRef: any, borderClass: string, extraClassName = "flex-1 flex flex-col",
	) => (
		<div
			onDoubleClick={() => props.handleToggleMaximize?.(type as any)}
			onPointerDownCapture={() => props.setActiveViewport?.(type as any)}
			onMouseEnter={() => props.onHoverViewport?.(type as any)}
			onMouseLeave={() => props.onHoverViewport?.(null)}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				props.activeViewport === type ? `ring-1 ring-cyan-500/50 border ${borderClass} shadow-lg` : `border border-zinc-800 hover:${borderClass}`
			} ${extraClassName}`}
			style={{ backgroundColor: "#000000" }}
			data-testid={`cbct-viewport-container-${type}`}
		>
			<div className="absolute inset-0 w-full h-full min-h-0 min-w-0 overflow-hidden" style={{ backgroundColor: "#000000" }}>
				<canvas ref={baseRef} style={{ backgroundColor: "#000000" }} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0" />
				<canvas
					ref={overlayRef}
					onDoubleClick={(e) => props.handleCanvasDoubleClick?.(type as any, e)}
					onMouseDown={(e) => props.handleCanvasMouseDown?.(type as any, e)}
					onMouseMove={(e) => props.handleCanvasMouseMove?.(type as any, e)}
					onMouseUp={props.handleCanvasMouseUp}
					onWheel={(e) => props.handleCanvasWheel?.(type as any, e)}
					style={{ cursor: props.getCanvasCursor?.(type as any) || "crosshair" }}
					className="absolute inset-0 w-full h-full object-contain z-10 touch-none"
				/>
				{props.renderViewportOverlays?.(type as any)}
			</div>
		</div>
	);

	const renderers: ViewportRenderers = {
		renderAxial: (cls) => renderViewport("axial", props.axialBaseCanvasRef, props.axialOverlayCanvasRef, "border-cyan-500", cls),
		renderCoronal: (cls) => renderViewport("coronal", props.coronalBaseCanvasRef, props.coronalOverlayCanvasRef, "border-emerald-500", cls),
		renderSagittal: (cls) => renderViewport("sagittal", props.sagittalBaseCanvasRef, props.sagittalOverlayCanvasRef, "border-rose-500", cls),
		renderPanoramic: (cls) => renderViewport("panoramic", props.panoBaseCanvasRef, props.panoOverlayCanvasRef, "border-purple-500", cls),
		renderCrossSection: (cls) => renderViewport("cross_section", props.crossSectionBaseCanvasRef, props.crossSectionOverlayCanvasRef, "border-amber-500", cls),
		renderVolume3D: (cls) => (
			<CbctVolume3DViewport
				volume={volume} extraClassName={cls} isActive={props.activeViewport === "panoramic"}
				onPointerDownCapture={() => props.setActiveViewport?.("panoramic")}
				onMouseEnter={() => props.onHoverViewport?.("panoramic")} onMouseLeave={() => props.onHoverViewport?.(null)}
				onDoubleClick={() => props.handleToggleMaximize?.("panoramic")} isMaximized={maximizedViewport === "panoramic"}
				onToggleMaximize={() => props.handleToggleMaximize?.("panoramic")} nervePoints={props.nervePoints} crosshairMm={props.crosshairMm}
			/>
		),
	};

	const commonProps = {
		volume, archCurve, renderers, maximizedViewport, mobileActiveTab, patientDisplayName,
		activeCrossSection, activeCrossSectionIdx, crossSections, onChangeCrossSectionIdx,
		handleSelectTooth: handleSelectTooth ? (fdi: number | string) => handleSelectTooth(Number(fdi)) : undefined,
		selectedBrand, onSelectBrand, selectedDiameterMm, onSelectDiameterMm, selectedLengthMm, onSelectLengthMm,
		windowWidth, windowLevel, viewLayout, activeViewport: props.activeViewport || "axial",
		setActiveViewport: props.setActiveViewport || (() => {}), handleToggleMaximize: props.handleToggleMaximize || (() => {}),
	};

	if (studioMode === "panoramic") return <PanoramicWorkspace {...commonProps} />;
	if (studioMode === "endo") return <EndoWorkspace {...commonProps} />;
	if (studioMode === "implant") return <ImplantWorkspace {...commonProps} />;
	return <MprQuadWorkspace {...commonProps} />;
};
