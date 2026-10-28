import type { MprPlane } from "../cbctMprMath";
import { ROMEXIS_COLORS } from "../cbctOverlayDecorationMath";

export interface PlaneColors {
	axisColor1: string;
	axisColor2: string;
	planeAccentColor: string;
}

export function getPlaneCrosshairColors(plane: MprPlane, invertColors: boolean): PlaneColors {
	if (invertColors) {
		switch (plane) {
			case "axial":
				return { axisColor1: "#059669", axisColor2: "#e11d48", planeAccentColor: "#0284c7" };
			case "coronal":
				return { axisColor1: "#0284c7", axisColor2: "#e11d48", planeAccentColor: "#059669" };
			case "sagittal":
				return { axisColor1: "#0284c7", axisColor2: "#059669", planeAccentColor: "#e11d48" };
		}
	}
	switch (plane) {
		case "axial":
			return { axisColor1: ROMEXIS_COLORS.coronal, axisColor2: ROMEXIS_COLORS.sagittal, planeAccentColor: ROMEXIS_COLORS.axial };
		case "coronal":
			return { axisColor1: ROMEXIS_COLORS.axial, axisColor2: ROMEXIS_COLORS.sagittal, planeAccentColor: ROMEXIS_COLORS.coronal };
		case "sagittal":
			return { axisColor1: ROMEXIS_COLORS.axial, axisColor2: ROMEXIS_COLORS.coronal, planeAccentColor: ROMEXIS_COLORS.sagittal };
	}
}

export function drawCrosshairAxesAndReticle(
	ctx: CanvasRenderingContext2D,
	centerPx: { readonly x: number; readonly y: number },
	diag: number,
	gap: number,
	cosA: number,
	sinA: number,
	colors: PlaneColors,
	invertColors: boolean,
): void {
	ctx.save();
	ctx.shadowColor = invertColors ? "rgba(0, 0, 0, 0.95)" : "rgba(0, 0, 0, 0.85)";
	ctx.shadowBlur = invertColors ? 4 : 3;

	// Axis 1
	ctx.strokeStyle = colors.axisColor1;
	ctx.lineWidth = invertColors ? 1.4 : 1.2;
	ctx.beginPath();
	ctx.moveTo(centerPx.x - diag * cosA, centerPx.y - diag * sinA);
	ctx.lineTo(centerPx.x - gap * cosA, centerPx.y - gap * sinA);
	ctx.moveTo(centerPx.x + gap * cosA, centerPx.y + gap * sinA);
	ctx.lineTo(centerPx.x + diag * cosA, centerPx.y + diag * sinA);
	ctx.stroke();

	// Axis 2
	ctx.strokeStyle = colors.axisColor2;
	ctx.lineWidth = invertColors ? 1.4 : 1.2;
	ctx.beginPath();
	ctx.moveTo(centerPx.x + diag * sinA, centerPx.y - diag * cosA);
	ctx.lineTo(centerPx.x + gap * sinA, centerPx.y - gap * cosA);
	ctx.moveTo(centerPx.x - gap * sinA, centerPx.y + gap * cosA);
	ctx.lineTo(centerPx.x - diag * sinA, centerPx.y + diag * cosA);
	ctx.stroke();
	ctx.restore();

	// Central Reticle
	const microArm = 4.5;
	ctx.save();
	ctx.lineCap = "butt";
	ctx.shadowBlur = 0;
	ctx.lineWidth = 1.2;
	ctx.strokeStyle = invertColors ? "rgba(82, 82, 91, 0.85)" : "rgba(161, 161, 170, 0.75)";
	ctx.beginPath();
	ctx.moveTo(centerPx.x - microArm * cosA, centerPx.y - microArm * sinA);
	ctx.lineTo(centerPx.x + microArm * cosA, centerPx.y + microArm * sinA);
	ctx.moveTo(centerPx.x - microArm * sinA, centerPx.y + microArm * cosA);
	ctx.lineTo(centerPx.x + microArm * sinA, centerPx.y - microArm * cosA);
	ctx.stroke();
	ctx.restore();
}
