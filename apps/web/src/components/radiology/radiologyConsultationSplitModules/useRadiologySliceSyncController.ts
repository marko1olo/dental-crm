/**
 * DENTE CRM — Radiology Consultation Split: Slice & Navigation Sync Controller
 * Subcontroller for DICOM/RVG slice navigation, Z-coordinate synchronization, and bone measurements.
 * Strictly <= 500 lines (Mandate 8b & Engineering Route).
 */

import { useCallback, useMemo, useState } from "react";
import {
	computeSynchronizedSliceIndices,
	type BoneDimensionPoint,
	type StudySliceSeriesInfo,
} from "../cbctComparisonMath.js";
import type { ConsultationSlot, ViewportState } from "../consultationCanvasRenderers.js";
import { DEFAULT_Z_MM } from "./consultationConstants.js";

export interface UseRadiologySliceSyncControllerProps {
	readonly activeToothFdi?: string | number | undefined;
	readonly isSyncNav: boolean;
	readonly setLeftViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
	readonly setRightViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
}

export function useRadiologySliceSyncController({
	activeToothFdi,
	isSyncNav,
	setLeftViewport,
	setRightViewport,
}: UseRadiologySliceSyncControllerProps) {
	// Synchronous Slice Z-scroll toggle & physical Z coordinate for CT series
	const [isSyncSlices] = useState<boolean>(true);
	const [currentZMm, setCurrentZMm] = useState<number>(DEFAULT_Z_MM);

	// Bone measurements for Pre-op (baseline) and Post-op (followup)
	const [baselineBone] = useState<BoneDimensionPoint>({
		heightMm: 7.5,
		widthMm: 5.0,
		densityHU: 420,
		toothFdi: activeToothFdi ? String(activeToothFdi) : "16",
		measurementDate: "12.01.2024",
	});

	const [followupBone] = useState<BoneDimensionPoint>({
		heightMm: 11.7,
		widthMm: 6.5,
		densityHU: 840,
		toothFdi: activeToothFdi ? String(activeToothFdi) : "16",
		measurementDate: "15.07.2024",
	});

	// Synchronized slice calculation with slice thickness compensation
	const sliceSyncState = useMemo(() => {
		const baselineSeries: StudySliceSeriesInfo = {
			sliceCount: 300,
			sliceThicknessMm: 0.5,
		};
		const followupSeries: StudySliceSeriesInfo = {
			sliceCount: 150,
			sliceThicknessMm: 1.0,
		};
		return computeSynchronizedSliceIndices({
			currentZMm,
			baseline: baselineSeries,
			followup: followupSeries,
		});
	}, [currentZMm]);

	// Step Slice Z in physical millimeters
	const handleStepSliceZ = useCallback((deltaZMm: number) => {
		setCurrentZMm((prev) => Math.max(0, Math.min(150, prev + deltaZMm)));
	}, []);

	// Wheel Zoom with Synchronization & Slice Z-scroll
	const handleViewportWheel = useCallback(
		(slot: ConsultationSlot, e: React.WheelEvent<HTMLCanvasElement>) => {
			e.preventDefault();

			if (isSyncSlices && (e.shiftKey || e.altKey)) {
				const deltaZ = e.deltaY < 0 ? -1.0 : 1.0;
				handleStepSliceZ(deltaZ);
				return;
			}

			const factor = e.deltaY < 0 ? 1.15 : 0.87;

			const updateZoom = (prev: ViewportState) => {
				const nextZoom = Math.min(16.0, Math.max(0.2, prev.zoom * factor));
				return { ...prev, zoom: nextZoom };
			};

			if (isSyncNav) {
				setLeftViewport(updateZoom);
				setRightViewport(updateZoom);
			} else if (slot === "left") {
				setLeftViewport(updateZoom);
			} else {
				setRightViewport(updateZoom);
			}
		},
		[isSyncSlices, isSyncNav, handleStepSliceZ, setLeftViewport, setRightViewport],
	);

	return {
		isSyncSlices,
		currentZMm,
		setCurrentZMm,
		handleStepSliceZ,
		sliceSyncState,
		baselineBone,
		followupBone,
		handleViewportWheel,
	};
}
