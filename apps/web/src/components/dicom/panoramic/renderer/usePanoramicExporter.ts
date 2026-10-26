/**
 * usePanoramicExporter.ts — Экспорт панорамных реконструкций в медкарту и на диск (Мандат 8b <= 120 строк).
 */

import { useState } from "react";
import type { RefObject } from "react";
import { showToast } from "../../../GlobalToast";
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	downloadSnapshotLocally,
	exportSnapshotToClinicalRecord,
} from "../../../visiograph/VisiographExportService";
import type { VisiographWindowPreset } from "../../../visiograph/VisiographWindowPresets";
import type { BoneDensityRecommendation } from "../../panoramicMprMath";

export interface UsePanoramicExporterParams {
	canvasRef: RefObject<HTMLCanvasElement | null>;
	patientId: string | null | undefined;
	authHeaders?: Record<string, string> | undefined;
	sliceThicknessMm: number;
	blendMode: "mip" | "average";
	probedHU: number | null;
	currentPreset: VisiographWindowPreset;
	boneRecommendation: BoneDensityRecommendation | null;
	activePreset: string;
}

export function usePanoramicExporter(params: UsePanoramicExporterParams) {
	const {
		canvasRef, patientId, authHeaders = {}, sliceThicknessMm, blendMode,
		probedHU, currentPreset, boneRecommendation, activePreset,
	} = params;
	const [isExporting, setIsExporting] = useState(false);

	const handleExportToClinicalRecord = async () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		if (!patientId) {
			showToast("Пациент не выбран. Откройте снимок из амбулаторной карты для прикрепления к медкарте.", "error");
			return;
		}

		setIsExporting(true);
		try {
			const capturedAt = new Date().toISOString();
			const dataUri = captureHighDpiCanvas(canvas, {
				pixelRatio: 2,
				mimeType: "image/jpeg",
				quality: 0.92,
				burnInHeader: {
					patientId,
					capturedAt,
					finding: `Панорамная томография (Curved MPR), слой: ${sliceThicknessMm} мм (${blendMode.toUpperCase()}), HU: ${probedHU ?? "--"}`,
				},
			});

			const thumbUri = await createSnapshotThumbnail(canvas, 200, 0.85);

			const outcome = await exportSnapshotToClinicalRecord(
				{
					patientId,
					imageDataUri: dataUri,
					thumbnailDataUri: thumbUri,
					viewKind: "panoramic_mpr",
					preset: currentPreset,
					capturedAt,
					exposureTimeSec: undefined,
					exposureParameters: undefined,
					radiologicalFinding: `Панорамная реконструкция (Curved MPR) зубных рядов. Плотность кости: ${boneRecommendation?.label ?? "D2"} (${probedHU ?? 850} HU).`,
					clinicalNote: `Curved MPR: слой ${sliceThicknessMm} мм (${blendMode.toUpperCase()}). ${boneRecommendation?.clinicalAdvice ?? ""}`,
				},
				authHeaders,
			);

			if (outcome.success) {
				showToast("Снимок ОПТГ успешно прикреплен к медицинской карте!", "success");
			} else {
				showToast(outcome.message, "error");
			}
		} catch {
			showToast("Сбой при экспорте панорамы в медицинскую карту.", "error");
		} finally {
			setIsExporting(false);
		}
	};

	const handleLocalDownload = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dataUri = captureHighDpiCanvas(canvas, {
			pixelRatio: 2,
			mimeType: "image/jpeg",
			quality: 0.95,
		});
		downloadSnapshotLocally(dataUri, `panoramic_mpr_${activePreset}_${Date.now()}.jpg`);
		showToast("Снимок сохранен на диск в высоком разрешении", "success");
	};

	return { isExporting, handleExportToClinicalRecord, handleLocalDownload };
}
