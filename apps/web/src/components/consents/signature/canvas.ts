import type {
	SignaturePoint,
	SignatureStroke,
} from "./types";
import { drawSmoothStrokeOnContext } from "./strokeDrawing";

export { drawSmoothStrokeOnContext } from "./strokeDrawing";

export function setupCanvasHighDpi(
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	dpr?: number,
): CanvasRenderingContext2D | null {
	if (!canvas) return null;
	const ratio = dpr ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
	canvas.width = Math.round(width * ratio);
	canvas.height = Math.round(height * ratio);
	if (canvas.style) {
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
	}
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.scale(ratio, ratio);
		ctx.imageSmoothingEnabled = true;
	}
	return ctx;
}

export function getPointerCoordinates(
	event: { clientX: number; clientY: number; timeStamp?: number; pressure?: number },
	targetElement?: { getBoundingClientRect: () => { left: number; top: number; width?: number; height?: number } },
): SignaturePoint {
	const rect = targetElement?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
	const rectWidth = rect.width ?? 0;
	const rectHeight = rect.height ?? 0;
	const rawX = event.clientX - rect.left;
	const rawY = event.clientY - rect.top;
	const x = rectWidth > 0 ? Math.min(Math.max(rawX, 0), rectWidth) : rawX;
	const y = rectHeight > 0 ? Math.min(Math.max(rawY, 0), rectHeight) : rawY;
	const time = typeof event.timeStamp === "number" && event.timeStamp > 0 ? event.timeStamp : Date.now();
	const pressure = typeof event.pressure === "number" && event.pressure > 0 ? event.pressure : undefined;
	return { x, y, time, pressure };
}

export function drawAllStrokesOnCanvas(
	canvas: HTMLCanvasElement,
	strokes: SignatureStroke[],
	options: {
		backgroundColor?: string | undefined;
		defaultColor?: string | undefined;
		dpr?: number | undefined;
		width?: number | undefined;
		height?: number | undefined;
	} = {},
): void {
	if (!canvas) return;
	const w = options.width ?? (canvas.clientWidth || canvas.width || 400);
	const h = options.height ?? (canvas.clientHeight || canvas.height || 140);
	const ctx = setupCanvasHighDpi(canvas, w, h, options.dpr);
	if (!ctx) return;

	const bgColor = options.backgroundColor ?? "#ffffff";
	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, w, h);

	for (const stroke of strokes) {
		drawSmoothStrokeOnContext(ctx, stroke, options);
	}
}

export { exportSignatureToPng } from "./exportPng";
