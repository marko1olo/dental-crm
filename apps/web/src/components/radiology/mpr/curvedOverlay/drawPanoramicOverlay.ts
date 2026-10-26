import type { PanoramicOverlayParams } from "./types";
import { drawPanoramicWorldPass } from "./panoramicWorldPass";
import { drawPanoramicScreenPass } from "./panoramicScreenPass";

export function drawPanoramicOverlay(
	ctx: CanvasRenderingContext2D,
	params: PanoramicOverlayParams,
): void {
	const worldResult = drawPanoramicWorldPass(ctx, params);
	drawPanoramicScreenPass(ctx, params, worldResult);
}
