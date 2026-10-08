/**
 * DENTE CRM — CBCT 3D WebGL Context & Canvas Lifecycle Hook (Layer 3)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x
 */

import {
	CbctRenderTelemetryCollector,
	deriveAdaptiveRenderProfile,
	detectCbctHardwareCapabilities,
	getDowngradedAdaptiveProfile,
	type CbctAdaptiveRenderProfile,
	type CbctHardwareCapabilities,
} from "@dental/shared";
import { useEffect, useRef, useState } from "react";
import type { CbctVoxelVolume, Point3D } from "../../cbctMprMath";
import type { Implant3DWorldProjection } from "../../implantSafetyEngine";
import {
	disposeWebGl2VolumeRaymarching,
	initWebGl2VolumeRaymarching,
	type WebGlVolume3DState,
} from "../cbctVolume3DShaders";
import { renderVolume3DVectorOverlay } from "./volumeMeasurementOverlay";

export interface UseVolume3DContextParams {
	volume: CbctVoxelVolume | null;
	forceHibernated?: boolean | undefined;
	setIsInteracting: (val: boolean) => void;
	yaw: number;
	pitch: number;
	zoom: number;
	pan: { x: number; y: number };
	nervePoints?: readonly Point3D[] | undefined;
	interpolatedNerve3D?: readonly Point3D[] | undefined;
	implant3DWorld?: Implant3DWorldProjection | null | undefined;
	active3DImplants: readonly unknown[];
	nerveAuditResult?:
		| {
				readonly isDangerous: boolean;
				readonly isWarning: boolean;
				readonly netClearanceToCanalWallMm: number;
		  }
		| null
		| undefined;
}

export function useVolume3DContext({
	volume,
	forceHibernated = false,
	setIsInteracting,
	yaw,
	pitch,
	zoom,
	pan,
	nervePoints = [],
	interpolatedNerve3D = [],
	implant3DWorld = null,
	active3DImplants,
	nerveAuditResult = null,
}: UseVolume3DContextParams) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const canvas2dRef = useRef<HTMLCanvasElement | null>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const glStateRef = useRef<WebGlVolume3DState | null>(null);
	const hwCapsRef = useRef<CbctHardwareCapabilities | null>(null);
	const telemetryRef = useRef(new CbctRenderTelemetryCollector());

	const [isHibernated, setIsHibernated] = useState(false);
	const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
	const [isGpuActive, setIsGpuActive] = useState(false);
	const effectiveHibernated = isHibernated || Boolean(forceHibernated);

	const [activeProfile, setActiveProfile] = useState<CbctAdaptiveRenderProfile>(() =>
		deriveAdaptiveRenderProfile(
			{
				isDiscreteGpu: true,
				max3DTextureSize: 2048,
				hardwareConcurrency:
					typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 8,
				deviceMemoryGb: 8,
			},
			"nominal",
			"balanced",
		),
	);
	const activeProfileRef = useRef(activeProfile);
	activeProfileRef.current = activeProfile;

	useEffect(() => {
		const target = containerRef.current || canvasRef.current;
		if (!target || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					setCanvasDims({ width: Math.floor(width), height: Math.floor(height) });
				}
			}
		});
		ro.observe(target);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const onVis = () => {
			const hidden =
				typeof document !== "undefined" && document.visibilityState === "hidden";
			setIsHibernated(hidden);
			if (hidden) setIsInteracting(false);
		};
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", onVis);
		}
		return () => {
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", onVis);
			}
		};
	}, [setIsInteracting]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const onLost = (e: Event) => {
			e.preventDefault();
			if (glStateRef.current) {
				disposeWebGl2VolumeRaymarching(glStateRef.current);
				glStateRef.current = null;
			}
			setActiveProfile((prev) => {
				const dw = getDowngradedAdaptiveProfile(prev, "elevated");
				activeProfileRef.current = dw;
				return dw;
			});
			setIsGpuActive(false);
		};
		const onRestored = () => {
			try {
				const gl = canvas.getContext("webgl2", {
					alpha: true,
					antialias: false,
					depth: false,
					preserveDrawingBuffer: true,
					powerPreference: "high-performance",
					desynchronized: true,
				});
				if (gl) {
					glStateRef.current = initWebGl2VolumeRaymarching(gl);
					if (glStateRef.current) setIsGpuActive(true);
				}
			} catch {
				glStateRef.current = null;
				setIsGpuActive(false);
			}
		};
		canvas.addEventListener("webglcontextlost", onLost);
		canvas.addEventListener("webglcontextrestored", onRestored);
		return () => {
			canvas.removeEventListener("webglcontextlost", onLost);
			canvas.removeEventListener("webglcontextrestored", onRestored);
			if (glStateRef.current) {
				disposeWebGl2VolumeRaymarching(glStateRef.current);
				glStateRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		const canvas = overlayCanvasRef.current;
		if (!canvas || effectiveHibernated) return;
		const width = canvasDims.width || canvas.clientWidth || 320;
		const height = canvasDims.height || canvas.clientHeight || 280;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);
		if (volume) {
			renderVolume3DVectorOverlay(ctx, {
				volume,
				yaw,
				pitch,
				zoom,
				pan,
				width,
				height,
				nervePoints,
				interpolatedNerve3D,
				implant3DWorld,
				implantsList: active3DImplants as any,
				nerveAuditResult,
			});
		}
	}, [
		volume,
		yaw,
		pitch,
		zoom,
		pan,
		canvasDims,
		nervePoints,
		interpolatedNerve3D,
		implant3DWorld,
		nerveAuditResult,
		active3DImplants,
		effectiveHibernated,
	]);

	return {
		canvasRef,
		canvas2dRef,
		overlayCanvasRef,
		containerRef,
		glStateRef,
		canvasDims,
		isGpuActive,
		setIsGpuActive,
		effectiveHibernated,
		activeProfile,
		activeProfileRef,
		telemetryRef,
		hwCapsRef,
	};
}
