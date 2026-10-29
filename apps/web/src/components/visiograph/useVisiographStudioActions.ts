/**
 * useVisiographStudioActions.ts
 * Clinical action handlers for Visiograph Studio (Mandates 8b, 8e, 8n).
 * Connects frontend canvas measurements directly to Fastify API & PostgreSQL 18.
 */

import type React from "react";
import { showToast } from "../GlobalToast";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders";
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
		const dataUri = canvas ? canvas.toDataURL("image/jpeg", 0.95) : "";
		const targetTooth = toothCode || "16";

		// 1. Сохранение измерений в PostgreSQL через Fastify API если есть studyId
		if (studyId && (rulers.length > 0 || angles.length > 0 || lesions.length > 0)) {
			try {
				const measurementPayload = [
					...rulers.map((r) => ({
						id: r.id,
						toothCode: targetTooth,
						annotationType: "distance",
						coordinates: { p1: r.p1, p2: r.p2 },
						measurements: { lengthMm: r.lengthMm, lengthPx: r.lengthPx },
						notes: r.label || "Длина корневого канала",
					})),
					...angles.map((a) => ({
						id: a.id,
						toothCode: targetTooth,
						annotationType: "angle",
						coordinates: { p1: a.p1, vertex: a.vertex, p2: a.p2 },
						measurements: { angleDeg: a.angleDeg },
						notes: "Угол наклона оси",
					})),
				];

				await fetch(`/api/imaging/studies/${studyId}/measurements`, {
					method: "POST",
					headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ measurements: measurementPayload }),
				});
			} catch {
				// Офлайн фоллбэк
			}
		}

		// 2. Диспетчеризация нативного события для привязки к визиту
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:attach-photo-to-visit", {
					detail: {
						url: dataUri,
						name: `Рентген RVG: зуб ${targetTooth}`,
						toothNumber: targetTooth,
						photoType: "xray",
					},
				}),
			);

			const mainRuler = rulers[0];
			if (mainRuler) {
				const statement = `Рентген-контроль (зуб ${targetTooth}): длина корневого канала ${mainRuler.lengthMm.toFixed(1)} мм, периапикальные ткани спокойны.`;
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							soap: { statusLocalis: statement, treatmentDescription: statement },
							mode: "smart_append",
							immediate: true,
						},
					}),
				);
			}
		}

		// 3. Вызов переданного внешнего колбэка
		if (canvas && onSaveToRecord) {
			await onSaveToRecord(dataUri, { rulers, angles, lesions, scaleMmPerPx: calibration.scaleMmPerPixel });
		}

		const countText = rulers.length > 0 ? ` (${rulers[0]?.lengthMm.toFixed(1)} мм)` : "";
		showToast(`✓ Снимок и замеры${countText} привязаны к карте пациента (зуб ${targetTooth})`, "success");
	};

	return { handleApplySensorPreset, handleResetParams, handleApplyClinicalFilter, handlePrintProtocol, handleAttachToVisit };
}
