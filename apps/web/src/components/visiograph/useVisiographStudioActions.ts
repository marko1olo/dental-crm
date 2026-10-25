/**
 * useVisiographStudioActions.ts
 * Clinical action handlers for Visiograph Studio (Mandates 8b, 8e, 8n).
 */

import type React from "react";
import { DEFAULT_VISIOGRAPH_IMAGE_PARAMS, type VisiographImageParams } from "./VisiographImageProcessor";
import type { ClinicalVisiographFilterPreset } from "./VisiographWindowPresets";
import {
	type CalibrationReference,
	type RulerMeasurement,
	type AngleMeasurement,
	type PeriapicalLesion,
	recalculateRulersWithScale,
	recalculateLesionsWithScale,
} from "./VisiographMeasurementMath";
import { printVisiographLegalProtocol } from "./VisiographLegalPrintProtocol";
import type { SensorCalibrationPreset } from "./VisiographStudioTypes";

export interface StudioActionsOptions {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	patientId?: string | null | undefined;
	patientFullName?: string | undefined;
	doctorName?: string | undefined;
	studyId?: string | undefined;
	toothCode?: string | null | undefined;
	rulers: RulerMeasurement[];
	angles: AngleMeasurement[];
	lesions: PeriapicalLesion[];
	calibration: CalibrationReference;
	isCalibrated: boolean;
	activeClinicalFilter: string | null;
	setParams: React.Dispatch<React.SetStateAction<VisiographImageParams>>;
	setActiveClinicalFilter: React.Dispatch<React.SetStateAction<string | null>>;
	setActiveSensorPresetId: React.Dispatch<React.SetStateAction<string | null>>;
	setIsCalibrated: React.Dispatch<React.SetStateAction<boolean>>;
	setCalibration: React.Dispatch<React.SetStateAction<CalibrationReference>>;
	setRulers: React.Dispatch<React.SetStateAction<RulerMeasurement[]>>;
	setLesions: React.Dispatch<React.SetStateAction<PeriapicalLesion[]>>;
	onSaveToRecord?: ((dataUri: string, meta: { rulers: RulerMeasurement[]; angles: AngleMeasurement[]; lesions: PeriapicalLesion[]; scaleMmPerPx: number }) => Promise<void> | void) | undefined;
}

export function useVisiographStudioActions(opts: StudioActionsOptions) {
	const {
		canvasRef, patientId, patientFullName, doctorName, studyId, toothCode,
		rulers, angles, lesions, calibration, isCalibrated, activeClinicalFilter,
		setParams, setActiveClinicalFilter, setActiveSensorPresetId, setIsCalibrated,
		setCalibration, setRulers, setLesions, onSaveToRecord,
	} = opts;

	const handleApplySensorPreset = (preset: SensorCalibrationPreset) => {
		setActiveSensorPresetId(preset.id);
		setIsCalibrated(true);
		const newScale = preset.pixelSizeMm;
		setCalibration((prev) => ({ ...prev, type: "custom_mm", knownLengthMm: newScale * 100, pixelDistance: 100, scaleMmPerPixel: newScale }));
		setRulers((prev) => recalculateRulersWithScale(prev, newScale));
		setLesions((prev) => recalculateLesionsWithScale(prev, newScale));
		if (typeof window !== "undefined") {
			const canalRuler = rulers.find((r) => r.label?.includes("WL") || r.label?.includes("Канал:"));
			if (canalRuler) {
				window.dispatchEvent(new CustomEvent("dente-endo-wl-measured", {
					detail: { toothNumber: toothCode ? Number(toothCode) : 16, lengthMm: Math.round(canalRuler.lengthPx * newScale * 10) / 10 },
				}));
			}
		}
	};

	const handleResetParams = () => {
		setParams({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS });
		setActiveClinicalFilter(null);
	};

	const handleApplyClinicalFilter = (filter: ClinicalVisiographFilterPreset) => {
		if (activeClinicalFilter === filter.id) {
			setParams({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS });
			setActiveClinicalFilter(null);
			return;
		}
		setParams({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS, ...filter.params });
		setActiveClinicalFilter(filter.id);
	};

	const handlePrintProtocol = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		printVisiographLegalProtocol({
			canvas, patientId: patientId || "pat_unknown", patientFullName: patientFullName || "Пациент ДЕНТЕ",
			doctorName: doctorName || "Врач-рентгенолог ДЕНТЕ", studyId, toothCode, isCalibrated, calibration, rulers, angles, lesions,
		});
	};

	const handleAttachToVisit = async () => {
		const canvas = canvasRef.current;
		if (canvas && onSaveToRecord) {
			const dataUri = canvas.toDataURL("image/jpeg", 0.95);
			await onSaveToRecord(dataUri, { rulers, angles, lesions, scaleMmPerPx: calibration.scaleMmPerPixel });
		} else {
			handlePrintProtocol();
		}
	};

	return { handleApplySensorPreset, handleResetParams, handleApplyClinicalFilter, handlePrintProtocol, handleAttachToVisit };
}
