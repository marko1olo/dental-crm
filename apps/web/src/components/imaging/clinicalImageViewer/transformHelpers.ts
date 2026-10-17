import type { ViewerRulerMeasurement } from "./types.js";

export function extractTransformParams(transformStr?: string): {
	zoom: number;
	panX: number;
	panY: number;
	rotationDeg: number;
	flipHorizontal: boolean;
} {
	if (!transformStr || transformStr === "none") {
		return { zoom: 1, panX: 0, panY: 0, rotationDeg: 0, flipHorizontal: false };
	}
	const scaleMatch = transformStr.match(/scale\(([-0-9.]+)\)/);
	const zoom = scaleMatch ? Math.max(0.1, Number.parseFloat(scaleMatch[1] ?? "1") || 1) : 1;

	const translateMatch = transformStr.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
	const panX = translateMatch ? Number.parseFloat(translateMatch[1] ?? "0") || 0 : 0;
	const panY = translateMatch ? Number.parseFloat(translateMatch[2] ?? "0") || 0 : 0;

	const rotateMatch = transformStr.match(/rotate\(([-0-9.]+)deg\)/);
	const rotationDeg = rotateMatch ? Number.parseFloat(rotateMatch[1] ?? "0") || 0 : 0;

	const flipHorizontal = /scaleX\(-1\)/.test(transformStr);

	return { zoom, panX, panY, rotationDeg, flipHorizontal };
}

export function clientToImagePercent(
	clientX: number,
	clientY: number,
	rect: DOMRect,
	transformStr?: string,
): { x: number; y: number } {
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	const { zoom, panX, panY } = extractTransformParams(transformStr);
	const dxScreen = clientX - (cx + panX);
	const dyScreen = clientY - (cy + panY);
	const unzoomedX = cx + dxScreen / zoom;
	const unzoomedY = cy + dyScreen / zoom;
	const xPct = ((unzoomedX - rect.left) / rect.width) * 100;
	const yPct = ((unzoomedY - rect.top) / rect.height) * 100;
	return { x: Math.max(0, Math.min(100, xPct)), y: Math.max(0, Math.min(100, yPct)) };
}

export function buildRulerMeasurement(params: {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	rect: DOMRect;
	pixelSpacingMm: number;
	toothCode?: string | number | null | undefined;
}): ViewerRulerMeasurement | null {
	const dxPx = ((params.endX - params.startX) / 100) * params.rect.width;
	const dyPx = ((params.endY - params.startY) / 100) * params.rect.height;
	const distPx = Math.hypot(dxPx, dyPx);
	if (distPx <= 8) return null;
	const lengthMm = Math.round(distPx * (params.pixelSpacingMm || 0.04) * 10) / 10;
	return {
		id: `m-${Date.now()}-${Math.floor(performance.now() * 1000)}`,
		startX: params.startX,
		startY: params.startY,
		endX: params.endX,
		endY: params.endY,
		lengthMm,
		distanceMm: lengthMm,
		label: params.toothCode ? `Канал #${params.toothCode}` : "Длина канала",
	};
}
