/**
 * DENTE CRM — DICOM Toolbox Ribbon State & Action Controller (Layer 3)
 * Strict invariants: Mandate 8b (<=120 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import { useState, useRef, useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import { calculateBoneDensityProfile, type HuProfileStats, type Point2D } from "../rvgViewerEngine.js";
import type {
	ClippingDir, ClippingPlane, ClippingRef,
	DicomRibbonControllerResult, DicomTabType, DicomToolboxRibbonProps,
} from "./types.js";
import { captureDicomCanvas } from "./dicomScreenCaptureHelper.js";
import { useDicomClickOutside } from "./useDicomClickOutside.js";

export function useDicomToolboxRibbonController(
	props: DicomToolboxRibbonProps,
): DicomRibbonControllerResult {
	const { viewportState, onViewportChange, measurements = [], toothFdiCode, onInsertToProtocol, activeTab: propActiveTab, onTabChange } = props;

	const [isMeasureMenuOpen, setIsMeasureMenuOpen] = useState(false);
	const [isWindowPanelOpen, setIsWindowPanelOpen] = useState(false);
	const [isClippingPanelOpen, setIsClippingPanelOpen] = useState(false);
	const [isHuModalOpen, setIsHuModalOpen] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [internalActiveTab, setInternalActiveTab] = useState<DicomTabType>("2D");
	const activeTab = propActiveTab || internalActiveTab;

	const [clippingPlane, setClippingPlane] = useState<ClippingPlane>(viewportState.clippingPlane || "sagittal");
	const [clippingRef, setClippingRef] = useState<ClippingRef>("user");
	const [clippingDir, setClippingDir] = useState<ClippingDir>(viewportState.clippingDirection || "right");
	const [isClippingApplied, setIsClippingApplied] = useState(Boolean(viewportState.clippingActive));
	const [huProfileStats, setHuProfileStats] = useState<HuProfileStats | null>(null);

	const measureMenuRef = useRef<HTMLDivElement | null>(null);
	const windowPanelRef = useRef<HTMLDivElement | null>(null);
	const clippingPanelRef = useRef<HTMLDivElement | null>(null);

	useDicomClickOutside({
		measureMenuRef, windowPanelRef, clippingPanelRef,
		setIsMeasureMenuOpen, setIsWindowPanelOpen, setIsClippingPanelOpen,
	});

	const handleInstantScreenCapture = useCallback(
		(copyOnly = true) => captureDicomCanvas(copyOnly, toothFdiCode),
		[toothFdiCode],
	);

	const handleOpenHuProfile = useCallback(() => {
		const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='dicom-viewport-canvas']");
		let p1: Point2D = { x: 100, y: 200 };
		let p2: Point2D = { x: 300, y: 200 };
		if (measurements.length > 0) {
			const lastM = measurements[measurements.length - 1]!;
			p1 = lastM.p1; p2 = lastM.p2;
		}
		const stats = calculateBoneDensityProfile(
			p1, p2, viewportState.windowWidth, viewportState.windowCenter,
			viewportState.calibrationMmPerPixel || 0.0264, 32, canvas,
		);
		setHuProfileStats(stats);
		setIsHuModalOpen(true);
	}, [measurements, viewportState]);

	const handleInsertHuToProtocol = () => {
		if (!huProfileStats) return;
		const toothStr = toothFdiCode ? ` в зоне зуба ${toothFdiCode}` : "";
		const text = `Денситометрия костной ткани КЛКТ (шкала Хаунсфилда)${toothStr}: средняя плотность ${huProfileStats.meanHu} HU (Класс ${huProfileStats.dominantClass} по Misch). Диапазон: ${huProfileStats.minHu}..${huProfileStats.maxHu} HU на протяжении ${huProfileStats.lengthMm} мм. Костное ложе пригодно к дентальной имплантации.`;
		if (onInsertToProtocol) onInsertToProtocol(text);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(text).catch(() => {});
		}
		showToast("Протокол плотности кости (HU) внесён в медицинскую карту", "success");
		setIsHuModalOpen(false);
	};

	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen?.().catch(() => {});
			setIsFullscreen(true);
		} else {
			document.exitFullscreen?.().catch(() => {});
			setIsFullscreen(false);
		}
	};

	const handleApplyClippingToggle = () => {
		const next = !isClippingApplied;
		setIsClippingApplied(next);
		onViewportChange({ clippingActive: next, clippingPlane, clippingDirection: clippingDir });
		showToast(next ? `Обрезка применена (${clippingPlane}, ${clippingDir === "right" ? "справа" : "слева"})` : "Обрезка отключена", "success");
	};

	const setTab = (tab: DicomTabType) => {
		setInternalActiveTab(tab);
		onTabChange?.(tab);
	};

	return {
		isMeasureMenuOpen, setIsMeasureMenuOpen, isWindowPanelOpen, setIsWindowPanelOpen,
		isClippingPanelOpen, setIsClippingPanelOpen, isHuModalOpen, setIsHuModalOpen,
		isFullscreen, activeTab, setTab, clippingPlane, setClippingPlane,
		clippingRef, setClippingRef, clippingDir, setClippingDir, isClippingApplied,
		huProfileStats, measureMenuRef, windowPanelRef, clippingPanelRef,
		handleInstantScreenCapture, handleOpenHuProfile, handleInsertHuToProtocol,
		toggleFullscreen, handleApplyClippingToggle,
	};
}
