import type { MprPlane } from "../cbctMprMath";
import { type ObliqueRotationAngles, DEFAULT_OBLIQUE_ROTATION } from "../cbctObliqueMatrixMath";

export function getObliqueRotationLabel(plane: MprPlane, angleDeg: number): string {
	const safeAngle = Number.isFinite(angleDeg) ? angleDeg : 0;
	const sign = safeAngle > 0 ? "+" : "";
	const formatted = `${sign}${safeAngle.toFixed(1)}°`;
	switch (plane) {
		case "axial":
			return `Поворот: ${formatted}`;
		case "coronal":
			return `Наклон: ${formatted}`;
		case "sagittal":
			return `Наклон: ${formatted}`;
	}
}

export function resetObliqueRotationAngles(_angles?: ObliqueRotationAngles): ObliqueRotationAngles {
	return { ...DEFAULT_OBLIQUE_ROTATION };
}

export function resetPlaneObliqueAngle(
	angles: ObliqueRotationAngles,
	plane: MprPlane,
): ObliqueRotationAngles {
	const current = angles ?? DEFAULT_OBLIQUE_ROTATION;
	switch (plane) {
		case "axial":
			return { ...current, axialAngleDeg: 0 };
		case "coronal":
			return { ...current, coronalTiltDeg: 0 };
		case "sagittal":
			return { ...current, sagittalTiltDeg: 0 };
	}
}

export function normalizeAngleDeg(deg: number): number {
	if (!Number.isFinite(deg)) return 0;
	let normalized = deg % 360;
	if (normalized > 180) normalized -= 360;
	else if (normalized < -180) normalized += 360;
	const rounded = Number(normalized.toFixed(1));
	return Object.is(rounded, -0) ? 0 : rounded;
}
