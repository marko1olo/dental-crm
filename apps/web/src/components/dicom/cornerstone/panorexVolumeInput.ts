/**
 * panorexVolumeInput.ts — Подготовка объемных данных для ОПТГ / панорамной развертки (Мандат 8b <= 120 строк).
 */

import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { mat3ToMat4Direction, type Point2D, toTransferableScalarData } from "../../../utils/math/mprMath";
import { archFromStoredControlPoints, type CtPlanningMarkup } from "../ctPlanningPersistence";
import {
	buildPanoramicArch,
	type DrawnArchAnnotation,
	type PanoramicIssue,
	readVolumeScalarData,
} from "../panoramicArch";
import type { PanoramicVolumeInput } from "../PanoramicRendererWindow";

export function generatePanorexVolumeInput(params: {
	element: HTMLElement | null;
	volumeId: string | null;
	restoredMarkup: CtPlanningMarkup | null;
}): {
	issue?: PanoramicIssue;
	archSummary?: { points: number; lengthMm: number };
	splinePoints?: Point2D[];
	panorexVolume?: PanoramicVolumeInput;
} {
	const { element, volumeId, restoredMarkup } = params;
	if (!element) return { issue: "read_failed" };
	let annotations: readonly DrawnArchAnnotation[];
	try {
		annotations =
			cornerstoneTools.annotation.state.getAnnotations(
				cornerstoneTools.SplineROITool.toolName,
				element as HTMLDivElement,
			) ?? [];
	} catch {
		return { issue: "read_failed" };
	}

	let arch = buildPanoramicArch(annotations);
	if (arch.status !== "ready" && arch.reason === "no_arch") {
		const stored = restoredMarkup?.splinePoints ?? [];
		if (stored.length > 0) arch = archFromStoredControlPoints(stored);
	}
	if (arch.status !== "ready") return { issue: arch.reason };
	if (!volumeId) return { issue: "volume_not_ready" };

	const volume = cornerstone.cache.getVolume(volumeId);
	const voxels = readVolumeScalarData(
		volume
			? {
					dimensions: volume.dimensions,
					imageIds: volume.imageIds,
					voxelManager: volume.voxelManager,
				}
			: null,
		(imageId) => cornerstone.cache.getImage(imageId) !== undefined,
	);
	if (voxels.status !== "ready" || !volume) return { issue: "volume_not_ready" };

	const [dx, dy, dz] = volume.dimensions;
	const [ox, oy, oz] = volume.origin;
	const [sx, sy, sz] = volume.spacing;

	return {
		archSummary: { points: arch.controlPoints.length, lengthMm: arch.lengthMm },
		splinePoints: arch.curve,
		panorexVolume: {
			scalarData: toTransferableScalarData(voxels.scalarData),
			dimensions: [dx, dy, dz],
			origin: [ox, oy, oz],
			direction: mat3ToMat4Direction(volume.direction),
			spacing: [sx, sy, sz],
		},
	};
}
