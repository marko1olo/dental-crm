import { useCallback, useEffect, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	CANONICAL_CBCT_SETTINGS,
	type CbctInterpolationMethod,
	type DoctorCbctDefaultSettings,
	loadDoctorCbctSettings,
	resetDoctorCbctSettings,
	saveDoctorCbctSettings,
} from "../../radiology/cbctLutMath";
import { reconstructPanoramicView } from "../../radiology/dentalCurveEngine";
import {
	generateTunerLut,
	renderAxialSliceToCanvas,
	renderPanoToCanvas,
} from "../../radiology/tuner/cbctTunerSliceEngine";
import { useCbctTunerData } from "../../radiology/tuner/useCbctTunerData";

export function useDoctorCbctModalState(
	isOpen: boolean,
	onClose: () => void,
	onSaved?: (settings: DoctorCbctDefaultSettings) => void,
) {
	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement>(null);

	const [initialDefaults] = useState(() => loadDoctorCbctSettings());
	const [windowWidth, setWindowWidth] = useState<number>(initialDefaults.windowWidth);
	const [windowLevel, setWindowLevel] = useState<number>(initialDefaults.windowLevel);
	const [gamma, setGamma] = useState<number>(initialDefaults.gamma);
	const [airCutoffHU, setAirCutoffHU] = useState<number>(initialDefaults.airCutoffHU);
	const [mprThicknessMm, setMprThicknessMm] = useState<number>(initialDefaults.mprThicknessMm);
	const [panoThicknessMm, setPanoThicknessMm] = useState<number>(initialDefaults.panoThicknessMm);
	const [interpolationMethod, setInterpolationMethod] = useState<CbctInterpolationMethod>(() => initialDefaults.interpolationMethod ?? "bilinear");

	const [previewTab, setPreviewTab] = useState<"axial" | "pano">("axial");
	const [sliceZIndex, setSliceZIndex] = useState<number>(156);
	const { volume, archCurve, recommendedZIndex, isLoading, loadStatus } = useCbctTunerData("zakharov");

	useEffect(() => {
		if (recommendedZIndex && recommendedZIndex > 0) setSliceZIndex(recommendedZIndex);
	}, [recommendedZIndex]);

	useEffect(() => {
		if (isOpen) {
			const c = loadDoctorCbctSettings();
			setWindowWidth(c.windowWidth); setWindowLevel(c.windowLevel); setGamma(c.gamma);
			setAirCutoffHU(c.airCutoffHU); setMprThicknessMm(c.mprThicknessMm); setPanoThicknessMm(c.panoThicknessMm);
			setInterpolationMethod(c.interpolationMethod ?? "bilinear");
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const isCanonical =
		windowWidth === CANONICAL_CBCT_SETTINGS.windowWidth && windowLevel === CANONICAL_CBCT_SETTINGS.windowLevel &&
		Math.abs(gamma - CANONICAL_CBCT_SETTINGS.gamma) < 0.001 && airCutoffHU === CANONICAL_CBCT_SETTINGS.airCutoffHU &&
		Math.abs(mprThicknessMm - CANONICAL_CBCT_SETTINGS.mprThicknessMm) < 0.001 && Math.abs(panoThicknessMm - CANONICAL_CBCT_SETTINGS.panoThicknessMm) < 0.001;

	useEffect(() => {
		if (!isOpen || !volume || !axialCanvasRef.current) return;
		const lut = generateTunerLut({ windowWidth, windowLevel, gamma, softKneeCeiling: 255, useSoftKnee: false, airCutoffHU, sliceThicknessMm: mprThicknessMm, projectionMode: mprThicknessMm > 0 ? "average" : "native", sliceZIndex, invert: false, activePresetId: "" });
		renderAxialSliceToCanvas(axialCanvasRef.current, volume, { windowWidth, windowLevel, gamma, softKneeCeiling: 255, useSoftKnee: false, airCutoffHU, sliceThicknessMm: mprThicknessMm, projectionMode: mprThicknessMm > 0 ? "average" : "native", sliceZIndex, invert: false, activePresetId: "" }, lut, archCurve);
	}, [isOpen, volume, archCurve, sliceZIndex, windowWidth, windowLevel, gamma, airCutoffHU, mprThicknessMm]);

	useEffect(() => {
		if (!isOpen || !volume || !archCurve || !panoCanvasRef.current || previewTab !== "pano") return;
		const canvas = panoCanvasRef.current;
		let isCancelled = false;
		const timer = setTimeout(() => {
			try {
				const heightMm = volume.dimensions.height * (volume.spacingMm?.y || 0.25);
				const currentZMm = volume.originMm && volume.spacingMm ? volume.originMm.z + sliceZIndex * volume.spacingMm.z : undefined;
				const panoResult = reconstructPanoramicView(volume, archCurve, { windowWidth, windowLevel, gamma, useSoftKnee: false, softKneeCeiling: 255, airCutoffHU, projectionMode: "average", focalTroughThicknessMm: Math.max(1.0, panoThicknessMm), ...(currentZMm !== undefined ? { centerZMm: currentZMm } : {}), heightMm, invert: false, coarsePreview: false });
				if (!isCancelled && panoResult) renderPanoToCanvas(canvas, panoResult, currentZMm);
			} catch (err) { console.error("[DoctorCbctSettingsModal] Pano render failed:", err); }
		}, 60);
		return () => { isCancelled = true; clearTimeout(timer); };
	}, [isOpen, previewTab, volume, archCurve, sliceZIndex, windowWidth, windowLevel, gamma, airCutoffHU, panoThicknessMm]);

	const handleAxialWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		e.preventDefault();
		setSliceZIndex((prev) => Math.max(0, Math.min(volume.dimensions.depth - 1, prev + (e.deltaY > 0 ? -1 : 1))));
	}, [volume]);

	const handleSaveDefaults = useCallback(() => {
		const saved = saveDoctorCbctSettings({ windowWidth, windowLevel, gamma, airCutoffHU, mprThicknessMm, panoThicknessMm, interpolationMethod });
		showToast(`Параметры КЛКТ сохранены (W: ${saved.windowWidth}, L: ${saved.windowLevel})`, "success");
		onSaved?.(saved); onClose();
	}, [windowWidth, windowLevel, gamma, airCutoffHU, mprThicknessMm, panoThicknessMm, interpolationMethod, onSaved, onClose]);

	const handleResetCanonical = useCallback(() => {
		const canon = resetDoctorCbctSettings();
		setWindowWidth(canon.windowWidth); setWindowLevel(canon.windowLevel); setGamma(canon.gamma);
		setAirCutoffHU(canon.airCutoffHU); setMprThicknessMm(canon.mprThicknessMm); setPanoThicknessMm(canon.panoThicknessMm);
		setInterpolationMethod(canon.interpolationMethod ?? "bilinear");
		showToast("Сброшено на канонический стандарт КЛКТ (4025 HU / 525 HU)", "info");
	}, []);

	return {
		axialCanvasRef, panoCanvasRef, windowWidth, setWindowWidth, windowLevel, setWindowLevel,
		gamma, setGamma, airCutoffHU, setAirCutoffHU, mprThicknessMm, setMprThicknessMm,
		panoThicknessMm, setPanoThicknessMm, previewTab, setPreviewTab, sliceZIndex, setSliceZIndex,
		volume, isLoading, loadStatus, isCanonical, handleAxialWheel, handleSaveDefaults, handleResetCanonical,
	};
}
