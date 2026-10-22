/**
 * useCbctStudioArchReconstruction.ts — авто-поиск дуги, переключение челюсти (ВЧ/НЧ) и фоновая реконструкция ОПТГ / кросс-секций.
 */

import { useCallback, useEffect } from "react";
import {
	autoDetectDentalArch,
	findOcclusalZPlane,
	generateCrossSectionSlices,
	reconstructPanoramicView,
} from "../dentalCurveEngine";
import { getSharedCbctWorkerBridge } from "../mpr/cbctWorkerBridge";
import { showToast } from "../../GlobalToast";
import type { useCbctStudioModalState } from "./useCbctStudioModalState";
import type { StudioMode } from "../mpr/cbctStudioTypes";

export interface UseCbctStudioArchReconstructionProps {
	readonly isOpen: boolean;
	readonly state: ReturnType<typeof useCbctStudioModalState>;
	readonly onSelectStudioMode: (mode: StudioMode) => void;
}

export function useCbctStudioArchReconstruction({
	isOpen,
	state,
	onSelectStudioMode,
}: UseCbctStudioArchReconstructionProps) {
	const handleAutoDetectArch = useCallback(() => {
		if (!state.volume) {
			showToast("Для авто-поиска дуги требуется активный 3D объем КТ", "error");
			return;
		}
		try {
			const detected = autoDetectDentalArch(state.volume, state.jawType);
			state.setArchCurve(detected);
			if (state.studioMode !== "panoramic") onSelectStudioMode("panoramic");
			state.setShowDentalArch(true);
			const occlusalZMm = findOcclusalZPlane(state.volume, state.jawType);
			const midAnchor = detected.anchors[Math.floor(detected.anchors.length / 2)];
			state.setCrosshairMm({ x: midAnchor?.positionMm.x ?? 0, y: midAnchor?.positionMm.y ?? 0, z: occlusalZMm });
			showToast(`Авто-поиск дуги: выровнено ${detected.anchors.length} ориентиров`, "success");
		} catch {
			if (state.studioMode !== "panoramic") onSelectStudioMode("panoramic");
			state.setShowDentalArch(true);
			showToast("Авто-поиск дуги активирован", "info");
		}
	}, [state, onSelectStudioMode]);

	const handleSwitchJaw = useCallback((newJaw: "mandible" | "maxilla") => {
		state.setJawType(newJaw);
		if (!state.volume) {
			showToast(newJaw === "maxilla" ? "Верхняя челюсть (ВЧ)" : "Нижняя челюсть (НЧ)", "info");
			return;
		}
		try {
			const detected = autoDetectDentalArch(state.volume, newJaw);
			state.setArchCurve(detected);
			if (state.studioMode === "panoramic") state.setShowDentalArch(true);
			const occlusalZMm = detected.planeZMm ?? findOcclusalZPlane(state.volume, newJaw);
			let archCenterX = 0;
			let archCenterY = 0;
			if (detected.splinePointsMm.length > 0) {
				const midIdx = Math.floor(detected.splinePointsMm.length / 2);
				archCenterX = detected.splinePointsMm[midIdx]?.x ?? 0;
				archCenterY = detected.splinePointsMm[midIdx]?.y ?? 0;
			}
			state.setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
			showToast(newJaw === "maxilla" ? "ВЧ: Z-срез и дуга обновлены" : "НЧ: Z-срез и дуга обновлены", "success");
		} catch {
			showToast(`Переключено на ${newJaw === "maxilla" ? "ВЧ" : "НЧ"}`, "info");
		}
	}, [state]);

	useEffect(() => {
		if (!state.volume || !isOpen || state.volume.isProgressivePreview) return;
		let isCancelled = false;

		const panoRes = reconstructPanoramicView(state.volume, state.archCurve, {
			windowWidth: state.windowWidth,
			windowLevel: state.windowLevel,
			invert: state.invertColors,
			heightMm: state.volume.physicalSizeMm?.z ? Math.min(78.0, state.volume.physicalSizeMm.z * 0.98) : 74.0,
			pixelSpacingMm: 0.25,
			focalTroughThicknessMm: state.panoThicknessMm,
			projectionMode: state.panoProjectionMode,
			sharpenAmount: state.isUnsharpActive ? 0.18 : 0.0,
			gamma: 1.50,
			useSoftKnee: false,
			airCutoffHU: -500,
		} as any);
		state.setPanoramicData(panoRes);

		const bridge = getSharedCbctWorkerBridge();
		bridge
			.requestCrossSectionSeries({
				volume: state.volume,
				archCurve: state.archCurve,
				options: {
					stepMm: state.crossSectionStepMm,
					sliceCenterZMm: state.crosshairMm.z,
					widthMm: 24.0,
					heightMm: 34.0,
					windowWidth: state.windowWidth ?? 4025,
					windowLevel: state.windowLevel ?? 525,
					gamma: 1.50,
					airCutoffHU: -500,
					softKnee: false,
					slabThicknessMm: state.slabThicknessMm ?? 1.0,
					invert: state.invertColors,
				},
			})
			.then((crossSlices) => {
				if (!isCancelled && crossSlices.length > 0) {
					state.setCrossSections(crossSlices);
				}
			})
			.catch(() => {
				if (!isCancelled && state.volume) {
					const crossSlices = generateCrossSectionSlices(state.volume, state.archCurve, state.crossSectionStepMm, state.crosshairMm.z, {
						widthMm: 24.0,
						heightMm: 34.0,
						windowWidth: state.windowWidth ?? 4025,
						windowLevel: state.windowLevel ?? 525,
						gamma: 1.50,
						airCutoffHU: -500,
						softKnee: false,
						slabThicknessMm: state.slabThicknessMm ?? 1.0,
						invert: state.invertColors,
					});
					state.setCrossSections(crossSlices);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [
		state.volume, isOpen, state.archCurve, state.crossSectionStepMm, state.windowWidth,
		state.windowLevel, state.invertColors, state.crosshairMm.z, state.isUnsharpActive,
		state.panoThicknessMm, state.panoProjectionMode, state.slabThicknessMm,
	]);

	return {
		handleAutoDetectArch,
		handleSwitchJaw,
	};
}
