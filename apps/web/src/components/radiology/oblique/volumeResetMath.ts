import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import type { FullViewResetState } from "./types";
import { resetObliqueRotationAngles } from "./angleLabelsMath";
import { resetViewportTransform } from "./windowLevelZoomMath";

export function getVolumeCenterMm(volume: CbctVoxelVolume): Point3D {
	if (!volume || !volume.dimensions || !volume.spacingMm || !volume.originMm) {
		return { x: 0, y: 0, z: 0 };
	}
	const { dimensions: dim, spacingMm: sp, originMm: origin } = volume;
	return {
		x: Number((origin.x + (dim.width * sp.x) / 2.0).toFixed(2)),
		y: Number((origin.y + (dim.height * sp.y) / 2.0).toFixed(2)),
		z: Number((origin.z + (dim.depth * sp.z) / 2.0).toFixed(2)),
	};
}

export function resetFullViewAndOrientation(volume?: CbctVoxelVolume): FullViewResetState {
	return {
		angles: resetObliqueRotationAngles(),
		transform: resetViewportTransform(),
		crosshairMm: volume ? getVolumeCenterMm(volume) : { x: 0, y: 0, z: 0 },
	};
}
