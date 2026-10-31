/**
 * DENTE CRM — CBCT Tuner State and Interaction Hook
 * Manages viewports rendering, 16-bit LUT generation, CPR panoramic reconstruction,
 * and mouse/touch slice scrubbing.
 * Standards: DICOM Part 3 PS 3.3. Mandate 8b (< 300 lines).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reconstructPanoramicView } from "../../dentalCurveEngine";
import {
	DEFAULT_TUNER_PARAMS,
	TUNER_PRESETS,
	type TunerParams,
	formatTunerParamString,
} from "../cbctTunerTypes";
import {
	generateTunerLut,
	renderAxialSliceToCanvas,
	renderPanoToCanvas,
} from "../cbctTunerSliceEngine";
import { useCbctTunerData } from "../useCbctTunerData";

export function useCbctTunerPlaygroundState(initialPatientId = "zakharov") {
	const [params, setParams] = useState<TunerParams>(DEFAULT_TUNER_PARAMS);
	const [viewLayout, setViewLayout] = useState<"stacked" | "columns">("stacked");
	const [mobileSection, setMobileSection] = useState<"slices" | "controls">("slices");
	const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
	const [attachFeedback, setAttachFeedback] = useState<boolean>(false);
	const [cursorHU, setCursorHU] = useState<number | null>(null);
	const touchStartRef = useRef<{ clientY: number; startZ: number } | null>(null);

	const {
		selectedPatientId,
		setSelectedPatientId,
		volume,
		archCurve,
		recommendedZIndex,
	} = useCbctTunerData(initialPatientId);

	const axialCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// Sync Z-slider max with volume depth
	useEffect(() => {
		if (volume?.dimensions?.depth) {
			setParams((prev) => ({
				...prev,
				sliceZIndex: Math.min(volume.dimensions.depth - 1, Math.max(0, recommendedZIndex)),
			}));
		}
	}, [volume?.id, recommendedZIndex]);

	// Precomputed 16-Bit LUT
	const currentLut = useMemo(() => generateTunerLut(params), [params]);

	// Render Axial Slice
	useEffect(() => {
		const canvas = axialCanvasRef.current;
		if (!canvas || !volume) return;
		renderAxialSliceToCanvas(canvas, volume, params, currentLut, archCurve);
	}, [volume, params, currentLut, archCurve]);

	// Render Panoramic View (Debounced CPR)
	useEffect(() => {
		const canvas = panoCanvasRef.current;
		if (!canvas || !volume || !archCurve) return;

		let isCancelled = false;
		const timer = setTimeout(() => {
			if (isCancelled) return;
			try {
				const effectivePanoThickness = params.sliceThicknessMm > 0.05
					? Math.max(1.0, Math.min(16.0, params.sliceThicknessMm))
					: 1.0;
				const currentZMm = volume.originMm && volume.spacingMm
					? volume.originMm.z + params.sliceZIndex * volume.spacingMm.z
					: undefined;
				const maxPhysZ = volume.dimensions.depth * (volume.spacingMm?.z || 0.25);
				const heightMm = Math.min(maxPhysZ * 0.98, 76.0);
				const panoResult = reconstructPanoramicView(volume, archCurve, {
					windowWidth: params.windowWidth,
					windowLevel: params.windowLevel,
					gamma: params.gamma,
					useSoftKnee: params.useSoftKnee,
					softKneeCeiling: params.softKneeCeiling,
					airCutoffHU: params.airCutoffHU,
					projectionMode: params.projectionMode === "native" ? "average" : params.projectionMode,
					focalTroughThicknessMm: effectivePanoThickness,
					...(currentZMm !== undefined ? { centerZMm: currentZMm } : {}),
					heightMm,
					invert: params.invert,
					softKnee: params.useSoftKnee
						? { peakEnamel: params.softKneeCeiling, airCutoffHU: params.airCutoffHU }
						: false,
					coarsePreview: false,
				});

				if (!isCancelled && panoResult) {
					renderPanoToCanvas(canvas, panoResult, currentZMm);
				}
			} catch (err) {
				console.error("[CbctTuner] Pano reconstruction error:", err);
			}
		}, 60);

		return () => {
			isCancelled = true;
			clearTimeout(timer);
		};
	}, [volume, archCurve, params]);

	const handleCopyParams = useCallback(() => {
		const text = formatTunerParamString(params);
		if (navigator.clipboard) {
			navigator.clipboard.writeText(text).then(() => {
				setCopiedFeedback(true);
				setTimeout(() => setCopiedFeedback(false), 2000);
			});
		}
	}, [params]);

	const handleAttachToVisit = useCallback(() => {
		try {
			const axialCanvas = axialCanvasRef.current;
			const dataUrl = axialCanvas ? axialCanvas.toDataURL("image/png") : null;
			if (typeof window !== "undefined") {
				window.sessionStorage.setItem(
					"dente_last_attached_cbct_slice",
					JSON.stringify({
						patientId: selectedPatientId,
						sliceZIndex: params.sliceZIndex,
						params,
						hasPreview: Boolean(dataUrl),
						timestamp: new Date().toISOString(),
					}),
				);
			}
			setAttachFeedback(true);
			setTimeout(() => setAttachFeedback(false), 2500);
		} catch (err) {
			console.warn("[CbctTuner] Attach slice fallback:", err);
			setAttachFeedback(true);
			setTimeout(() => setAttachFeedback(false), 2500);
		}
	}, [selectedPatientId, params]);

	const handleApplyPreset = useCallback((presetId: string) => {
		const preset = TUNER_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setParams((prev) => ({
			...prev,
			...preset.params,
			activePresetId: presetId,
		}));
	}, []);

	const handleAxialWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		e.preventDefault();
		const delta = e.deltaY > 0 ? -1 : 1;
		setParams((prev) => {
			const maxZ = volume.dimensions.depth - 1;
			const nextZ = Math.max(0, Math.min(maxZ, prev.sliceZIndex + delta));
			return { ...prev, sliceZIndex: nextZ };
		});
	}, [volume]);

	const handleAxialMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = axialCanvasRef.current;
		if (!canvas || !volume?.data) return;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const vx = Math.floor((e.clientX - rect.left) * scaleX);
		const vy = Math.floor((e.clientY - rect.top) * scaleY);
		const { width, height, depth } = volume.dimensions;

		if (vx >= 0 && vx < width && vy >= 0 && vy < height && params.sliceZIndex < depth) {
			const idx = params.sliceZIndex * (width * height) + (vy * width + vx);
			const hu = volume.data[idx];
			if (typeof hu === "number") setCursorHU(hu);
		}
	}, [volume, params.sliceZIndex]);

	const handleAxialTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 1 && e.touches[0]) {
			touchStartRef.current = {
				clientY: e.touches[0].clientY,
				startZ: params.sliceZIndex,
			};
		}
	}, [params.sliceZIndex]);

	const handleAxialTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (!touchStartRef.current || !volume || e.touches.length !== 1 || !e.touches[0]) return;
		const deltaPx = touchStartRef.current.clientY - e.touches[0].clientY;
		const deltaSlices = Math.round(deltaPx / 6);
		const maxZ = volume.dimensions.depth - 1;
		const nextZ = Math.max(0, Math.min(maxZ, touchStartRef.current.startZ + deltaSlices));
		setParams((prev) => (prev.sliceZIndex === nextZ ? prev : { ...prev, sliceZIndex: nextZ }));
	}, [volume]);

	const handleAxialTouchEnd = useCallback(() => {
		touchStartRef.current = null;
	}, []);

	const maxDepth = volume ? volume.dimensions.depth - 1 : 300;
	const currentZMm = volume?.originMm?.z !== undefined && volume?.spacingMm?.z !== undefined
		? (volume.originMm.z + params.sliceZIndex * volume.spacingMm.z).toFixed(1)
		: String(params.sliceZIndex);

	return {
		params,
		setParams,
		viewLayout,
		setViewLayout,
		mobileSection,
		setMobileSection,
		copiedFeedback,
		attachFeedback,
		cursorHU,
		setCursorHU,
		selectedPatientId,
		setSelectedPatientId,
		axialCanvasRef,
		panoCanvasRef,
		maxDepth,
		currentZMm,
		handleCopyParams,
		handleAttachToVisit,
		handleApplyPreset,
		handleAxialWheel,
		handleAxialMouseMove,
		handleAxialTouchStart,
		handleAxialTouchMove,
		handleAxialTouchEnd,
	};
}
