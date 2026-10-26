import { type ViewportTransform, DEFAULT_VIEWPORT_TRANSFORM } from "../cbctObliqueMatrixMath";

export function applyWindowLevelDrag(
	currentWW: number,
	currentWL: number,
	deltaX: number,
	deltaY: number,
	sensitivity = 2.0,
): { windowWidth: number; windowLevel: number } {
	const newWW = Math.max(1, Math.min(6000, Math.round(currentWW + deltaX * sensitivity)));
	const newWL = Math.max(-1500, Math.min(3000, Math.round(currentWL - deltaY * sensitivity)));

	return {
		windowWidth: newWW,
		windowLevel: newWL,
	};
}

export function applyCursorZoom(
	currentTransform: ViewportTransform,
	cursorPx: { readonly x: number; readonly y: number },
	zoomDelta: number,
	minZoom = 0.5,
	maxZoom = 5.0,
): ViewportTransform {
	const safeMin = Math.max(0.1, minZoom);
	const safeMax = Math.max(safeMin, maxZoom);
	const currentZoom = Number.isFinite(currentTransform?.zoom) && currentTransform.zoom >= safeMin
		? Math.min(safeMax, currentTransform.zoom)
		: 1.0;
	const panX = Number.isFinite(currentTransform?.panX) ? currentTransform.panX : 0;
	const panY = Number.isFinite(currentTransform?.panY) ? currentTransform.panY : 0;

	if (!Number.isFinite(zoomDelta)) {
		return {
			zoom: Number(currentZoom.toFixed(3)),
			panX: Number(panX.toFixed(1)),
			panY: Number(panY.toFixed(1)),
		};
	}

	const zoomFactor = Math.exp(-zoomDelta * 0.0015);
	const newZoom = Math.max(safeMin, Math.min(safeMax, currentZoom * zoomFactor));

	const curX = Number.isFinite(cursorPx?.x) ? cursorPx.x : 0;
	const curY = Number.isFinite(cursorPx?.y) ? cursorPx.y : 0;

	const worldPointX = (curX - panX) / currentZoom;
	const worldPointY = (curY - panY) / currentZoom;

	const newPanX = curX - worldPointX * newZoom;
	const newPanY = curY - worldPointY * newZoom;

	return {
		zoom: Number(newZoom.toFixed(3)),
		panX: Number(newPanX.toFixed(1)),
		panY: Number(newPanY.toFixed(1)),
	};
}

export function applyPanDrag(
	currentTransform: ViewportTransform,
	deltaX: number,
	deltaY: number,
): ViewportTransform {
	const currentZoom = Number.isFinite(currentTransform?.zoom) && currentTransform.zoom > 0 ? currentTransform.zoom : 1.0;
	const currentPanX = Number.isFinite(currentTransform?.panX) ? currentTransform.panX : 0;
	const currentPanY = Number.isFinite(currentTransform?.panY) ? currentTransform.panY : 0;
	const safeDx = Number.isFinite(deltaX) ? deltaX : 0;
	const safeDy = Number.isFinite(deltaY) ? deltaY : 0;

	return {
		zoom: currentZoom,
		panX: Number((currentPanX + safeDx).toFixed(1)),
		panY: Number((currentPanY + safeDy).toFixed(1)),
	};
}

export function resetViewportTransform(): ViewportTransform {
	return { ...DEFAULT_VIEWPORT_TRANSFORM };
}
