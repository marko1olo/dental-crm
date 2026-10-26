/**
 * snapshotExporter.ts — Экспорт скриншотов срезов и перевод координат клика (Мандат 8b <= 120 строк).
 */

import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	exportSnapshotToClinicalRecord,
} from "../../visiograph/VisiographExportService";
import { VISIOGRAPH_WINDOW_PRESETS, type VisiographPresetId } from "../VisiographWindowPresets";
import type { ImplantData } from "../cornerstoneTypes";
import type { WorldPoint3 } from "../ctPlanningPersistence";

export async function exportCornerstoneSnapshot(params: {
	targetDiv: HTMLElement | null;
	patientId: string | null;
	implants: ImplantData[];
	activePresetId: VisiographPresetId;
	aiProtocolLog: string;
	authHeaders?: Record<string, string>;
}): Promise<{ success: boolean; message?: string }> {
	const { targetDiv, patientId, implants, activePresetId, aiProtocolLog, authHeaders = {} } = params;
	if (!targetDiv) return { success: false, message: "Контейнер среза не найден" };
	const canvas = targetDiv.querySelector("canvas");
	if (!canvas) return { success: false, message: "Холст 3D MPR не найден для создания снимка." };
	if (!patientId) return { success: false, message: "Пациент не выбран." };

	const lastImplant = implants[implants.length - 1];
	const capturedAt = new Date().toISOString();
	const dataUri = captureHighDpiCanvas(canvas, {
		pixelRatio: 2,
		mimeType: "image/jpeg",
		quality: 0.92,
		burnInHeader: {
			patientId,
			toothCode: lastImplant?.fdiCode ? String(lastImplant.fdiCode) : undefined,
			capturedAt,
			finding: lastImplant
				? `Имплантат Ø${lastImplant.diameter}x${lastImplant.length}мм, ${lastImplant.boneDensity.classification} (${Math.round(lastImplant.boneDensity.averageHU)} HU)`
				: "3D КЛКТ MPR аксиальный срез",
		},
	});
	const thumbUri = await createSnapshotThumbnail(canvas, 200, 0.85);

	return exportSnapshotToClinicalRecord(
		{
			patientId,
			imageDataUri: dataUri,
			thumbnailDataUri: thumbUri,
			viewKind: "mpr_axial",
			preset: VISIOGRAPH_WINDOW_PRESETS[activePresetId],
			capturedAt,
			...(lastImplant?.fdiCode ? { fdiToothCode: String(lastImplant.fdiCode), toothCode: String(lastImplant.fdiCode) } : {}),
			...(typeof lastImplant?.distanceToNerve === "number" ? { nerveDistanceMm: lastImplant.distanceToNerve } : {}),
			...(lastImplant?.boneDensity ? { boneDensity: { averageHU: lastImplant.boneDensity.averageHU, classification: String(lastImplant.boneDensity.classification) } } : {}),
			...(lastImplant ? { implantDetails: { diameterMm: lastImplant.diameter, lengthMm: lastImplant.length } } : {}),
			radiologicalFinding: lastImplant
				? `3D КЛКТ срез: область зуба № ${lastImplant.fdiCode}. Плотность: ${lastImplant.boneDensity.classification} (${Math.round(lastImplant.boneDensity.averageHU)} HU).`
				: "3D КЛКТ MPR аксиальный срез челюстно-лицевой области.",
			...(aiProtocolLog ? { aiProtocolLog } : {}),
			clinicalNote: `3D MPR аксиальный срез КЛКТ. Режим HU: ${VISIOGRAPH_WINDOW_PRESETS[activePresetId].label}.`,
		},
		authHeaders,
	);
}

export function computeClickWorldCoords(vp: any, container: HTMLElement, clientX: number, clientY: number): WorldPoint3 | null {
	const rect = container.getBoundingClientRect();
	const canvasX = clientX - rect.left;
	const canvasY = clientY - rect.top;
	let worldX: number | null = null;
	let worldY: number | null = null;
	let worldZ: number | null = null;
	try {
		if (typeof vp?.canvasToWorld === "function") {
			const pt = vp.canvasToWorld([canvasX, canvasY]);
			if (pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1]) && Number.isFinite(pt[2])) {
				worldX = pt[0]; worldY = pt[1]; worldZ = pt[2];
			}
		}
	} catch {}
	if (worldX === null || worldY === null || worldZ === null) {
		const focal = vp?.getCamera()?.focalPoint;
		if (focal && Number.isFinite(focal[0]) && Number.isFinite(focal[1]) && Number.isFinite(focal[2])) {
			worldX = focal[0]; worldY = focal[1]; worldZ = focal[2];
		}
	}
	if (worldX === null || worldY === null || worldZ === null) return null;
	return { x: Number(worldX.toFixed(2)), y: Number(worldY.toFixed(2)), z: Number(worldZ.toFixed(2)) };
}
