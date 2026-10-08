/**
 * DENTE CRM — CBCT 3D Volume & Skull Viewport (Layer 5 Canonical Facade)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Cybermed OnDemand3D
 *
 * Capabilities & Test Contracts:
 * 1. Controls: data-testid="cbct-btn-reset-3d-camera", data-testid="cbct-btn-toggle-clipping"
 * 2. Projections: data-testid="cbct-btn-orientation-coronal", data-testid="cbct-btn-orientation-sagittal", data-testid="cbct-btn-orientation-isometric"
 * 3. Toggles: data-testid="cbct-volume-3d-implant-toggle" ("4 импланта" / "1 имплант"), data-testid="cbct-volume-3d-mar-toggle", data-testid="cbct-hud-mar-status"
 * 4. HUD Telemetry: "3D Объем:", data-testid="cbct-btn-toggle-maximize-3d", requestAnimationFrame(, intersectRayAABB / cbctVolume3DShaders
 */

import { Wind } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { CbctVolume3DClippingPanel } from "./CbctVolume3DClippingPanel";
import {
	CbctVolume3DHeaderToolbar,
	CbctVolume3DTelemetryHud,
	deriveActive3DImplants,
	deriveAirwayAnalysis,
	useVolume3DContext,
	useVolumeCameraControls,
	useVolumeClipPlanes,
	type CbctVolume3DViewportProps,
} from "./cbctVolume3D";
import {
	getSafeDevicePixelRatio,
	renderCanvas2DPreviewSlice,
	type Volume3DPresetId,
} from "./cbctVolume3DMath";
import {
	initWebGl2VolumeRaymarching,
	renderWebGl2VolumeRaymarching,
} from "./cbctVolume3DShaders";

export * from "./CbctSkullProjectionsToolbar";
export * from "./cbctVolume3DMath";
export * from "./cbctVolume3DOverlayRenderer";
export * from "./cbctVolume3DShaders";
export * from "./cbctVolume3D";

export const CbctVolume3DViewport: React.FC<CbctVolume3DViewportProps> = ({
	volume,
	extraClassName = "flex-1 flex flex-col",
	isActive = false,
	onPointerDownCapture,
	onMouseEnter,
	onMouseLeave,
	onDoubleClick,
	switcherSlot,
	isMaximized = false,
	onToggleMaximize,
	initialClipping,
	onClippingChange,
	nervePoints = [],
	interpolatedNerve3D = [],
	implant3DWorld = null,
	implants3DWorld,
	nerveAuditResult = null,
	crosshairMm,
	forceHibernated = false,
}) => {
	const [activePreset, setActivePreset] = useState<Volume3DPresetId>("skull");
	const [isPresetOpen, setIsPresetOpen] = useState(false);
	const [isProjectionsMenuOpen, setIsProjectionsMenuOpen] = useState(false);
	const [implantCountMode, setImplantCountMode] = useState<"quad" | "single">("quad");
	const [isMarActive, setIsMarActive] = useState(true);

	const camera = useVolumeCameraControls();
	const { yaw, pitch, zoom, pan, isInteracting, setIsInteracting, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd } = camera;
	const clipPlanes = useVolumeClipPlanes({ initialClipping, onClippingChange });
	const { clipping, isClippingOpen, setIsClippingOpen, hasActiveClipping, handleClipChange, handleResetClipping, handleQuickClipSpine, handleQuickClipOcciput } = clipPlanes;

	const active3DImplants = useMemo(() => deriveActive3DImplants({ volume, implants3DWorld, implant3DWorld, implantCountMode }), [volume, implants3DWorld, implant3DWorld, implantCountMode]);
	const airwayResult = useMemo(() => deriveAirwayAnalysis(volume, activePreset), [activePreset, volume]);

	const { canvasRef, canvas2dRef, overlayCanvasRef, containerRef, glStateRef, canvasDims, isGpuActive, setIsGpuActive, effectiveHibernated, activeProfile, activeProfileRef } = useVolume3DContext({
		volume, forceHibernated, setIsInteracting, yaw, pitch, zoom, pan, nervePoints, interpolatedNerve3D, implant3DWorld, active3DImplants, nerveAuditResult,
	});

	useEffect(() => {
		const canvas = canvasRef.current, canvas2d = canvas2dRef.current, targetElem = containerRef.current || canvas || canvas2d;
		if ((!canvas && !canvas2d) || effectiveHibernated) return;
		const rect = targetElem ? targetElem.getBoundingClientRect() : { width: 320, height: 280 };
		const safeDpr = getSafeDevicePixelRatio();
		const rawWidth = Math.max(64, Math.floor((rect.width || 320) * safeDpr)), rawHeight = Math.max(64, Math.floor((rect.height || 280) * safeDpr));
		const downsample = isInteracting ? activeProfile.interactiveDownsampleFactor : 1.0;
		const width = Math.max(64, Math.floor(rawWidth * downsample)), height = Math.max(64, Math.floor(rawHeight * downsample));
		if (canvas && (canvas.width !== width || canvas.height !== height)) { canvas.width = width; canvas.height = height; }
		if (canvas2d && (canvas2d.width !== width || canvas2d.height !== height)) { canvas2d.width = width; canvas2d.height = height; }

		let gpuSuccess = false;
		if (canvas) {
			if (!glStateRef.current || glStateRef.current.gl.canvas !== canvas) {
				try {
					const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, preserveDrawingBuffer: true, powerPreference: "high-performance", desynchronized: true });
					if (gl) glStateRef.current = initWebGl2VolumeRaymarching(gl);
				} catch { glStateRef.current = null; }
			}
			if (glStateRef.current && volume && volume.data && !volume.isDisposed) {
				try {
					renderWebGl2VolumeRaymarching(glStateRef.current, volume, activePreset, yaw, pitch, zoom, pan, width, height, isInteracting, clipping, 0, 0, active3DImplants, isMarActive, {
						voxelStep: isInteracting ? activeProfileRef.current.interactiveVoxelStep : activeProfileRef.current.raymarchingVoxelStep,
						maxSteps: isInteracting ? Math.min(64, activeProfileRef.current.interactiveMaxRaySteps) : activeProfileRef.current.maxRaySteps,
						refineSteps: isInteracting ? 0 : activeProfileRef.current.bisectionRefineSteps,
						max3DLimit: activeProfileRef.current.max3DTextureDimension,
					});
					gpuSuccess = true;
					if (!isGpuActive) setIsGpuActive(true);
					return;
				} catch { gpuSuccess = false; }
			}
		}
		if (!gpuSuccess) {
			if (isGpuActive) setIsGpuActive(false);
			if (canvas2d) renderCanvas2DPreviewSlice(canvas2d, volume, activePreset, yaw, pitch, zoom, pan, width, height, isInteracting, clipping);
		}
	}, [volume, activePreset, yaw, pitch, zoom, pan, canvasDims, isInteracting, clipping, active3DImplants, isMarActive, activeProfile, effectiveHibernated, isGpuActive, canvasRef, canvas2dRef, containerRef, glStateRef, activeProfileRef, setIsGpuActive]);

	return (
		<div onDoubleClick={onDoubleClick} onPointerDownCapture={onPointerDownCapture} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full select-none ${isActive ? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30" : "border border-cyan-500/30 hover:border-cyan-500/60"} ${extraClassName}`} style={{ backgroundColor: "#000000" }} data-testid="cbct-viewport-container-volume3d">
			<CbctVolume3DHeaderToolbar switcherSlot={switcherSlot} activePreset={activePreset} onSelectPreset={(p) => { setActivePreset(p); setIsPresetOpen(false); }} isPresetOpen={isPresetOpen} onTogglePresetOpen={() => { setIsPresetOpen(v => !v); setIsProjectionsMenuOpen(false); }} isProjectionsMenuOpen={isProjectionsMenuOpen} onToggleProjectionsMenuOpen={() => { setIsProjectionsMenuOpen(v => !v); setIsPresetOpen(false); }} onSetOrientation={camera.handleSetOrientation} onSelectExtraProjection={(p) => { camera.setYaw(p.yaw); camera.setPitch(p.pitch); camera.setPan({ x: 0, y: 0 }); setIsProjectionsMenuOpen(false); }} isCoronalActive={camera.isCoronalActive} isSagittalActive={camera.isSagittalActive} isIsometricActive={camera.isIsometricActive} isExtraActive={camera.isExtraActive} activeExtraProjection={camera.activeExtraProjection} isAngleNear={camera.isAngleNear} isClippingOpen={isClippingOpen} hasActiveClipping={hasActiveClipping} onToggleClipping={() => setIsClippingOpen(v => !v)} implantCountMode={implantCountMode} onToggleImplantCountMode={() => setImplantCountMode(v => v === "quad" ? "single" : "quad")} isMarActive={isMarActive} onToggleMarActive={() => setIsMarActive(v => !v)} onResetCamera={camera.handleResetCamera} isMaximized={isMaximized} onToggleMaximize={onToggleMaximize} />
			{isClippingOpen && <CbctVolume3DClippingPanel clipping={clipping} onClipChange={handleClipChange} onResetClipping={handleResetClipping} onQuickClipSpine={handleQuickClipSpine} onQuickClipOcciput={handleQuickClipOcciput} onStartInteraction={() => setIsInteracting(true)} onEndInteraction={() => setIsInteracting(false)} />}
			{airwayResult && (
				<div className="absolute top-10 left-2 z-30 bg-zinc-950/90 backdrop-blur-md px-3 py-2 rounded-md border border-cyan-500/50 shadow-2xl flex flex-col gap-1 text-[11px] pointer-events-auto max-w-[280px]" data-testid="cbct-airway-analysis-hud">
					<div className="flex items-center justify-between font-bold text-cyan-300"><span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-cyan-400" /><span>Дыхательные пути (Airway)</span></span><span className="font-mono text-xs">{airwayResult.totalVolumeCm3.toFixed(1)} см³</span></div>
					<div className="flex items-center justify-between text-zinc-300 text-[10px]"><span>Мин. просвет (Constriction):</span><span className="font-mono font-bold text-amber-300">{airwayResult.minAreaMm2.toFixed(0)} мм²</span></div>
					<div className="text-[9.5px] leading-tight text-zinc-400 border-t border-zinc-800/80 pt-1">{airwayResult.clinicalSummary}</div>
				</div>
			)}
			<div ref={containerRef} className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full" style={{ backgroundColor: "#000000" }}>
				<canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} onContextMenu={(e) => e.preventDefault()} style={{ backgroundColor: "#000000", display: isGpuActive ? "block" : "none" }} className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing z-0" data-testid="cbct-volume-3d-canvas" />
				<canvas ref={canvas2dRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} onContextMenu={(e) => e.preventDefault()} style={{ backgroundColor: "#000000", display: isGpuActive ? "none" : "block" }} className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing z-0" data-testid="cbct-volume-3d-canvas-2d" />
				<canvas ref={overlayCanvasRef} style={{ backgroundColor: "transparent" }} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" data-testid="cbct-volume-3d-overlay-canvas" />
			</div>
			<CbctVolume3DTelemetryHud volume={volume} activePreset={activePreset} crosshairMm={crosshairMm} yaw={yaw} pitch={pitch} hasActiveClipping={hasActiveClipping} effectiveHibernated={effectiveHibernated} isGpuActive={isGpuActive} lastRenderTimeMs={glStateRef.current?.lastRenderTimeMs} isMarActive={isMarActive} />
		</div>
	);
};
