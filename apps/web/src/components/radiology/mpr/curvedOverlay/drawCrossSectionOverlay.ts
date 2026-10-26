import type { CrossSectionOverlayParams } from "./types";
import { drawCrossSectionWorldPass } from "./crossSectionWorldPass";
import { drawCrossSectionScreenPass } from "./crossSectionScreenPass";

export function drawCrossSectionOverlay(
	ctx: CanvasRenderingContext2D,
	params: CrossSectionOverlayParams,
): void {
	const worldResult = drawCrossSectionWorldPass(ctx, params);
	drawCrossSectionScreenPass(ctx, params, worldResult);
}
