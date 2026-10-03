/**
 * DENTE CRM — EzDent-i Consultation Canvas Rendering & Snapshot Engine
 *
 * Implements:
 * 1. High-precision vector arrow rendering for pathology marking
 * 2. Viewport 2D canvas transformations (pan, zoom, centering, invert filter)
 * 3. Screen-to-image coordinate projection
 * 4. Composite Dual-Viewport Snapshot generation (Camera tool)
 *
 * Mandate 8b: Decomposed helper module (<300 lines).
 */

export interface ViewportAnnotation {
	readonly id: string;
	readonly type: "freehand" | "arrow" | "text";
	readonly points: readonly { x: number; y: number }[];
	readonly text?: string;
	readonly color: string;
}

export interface ViewportState {
	imageSrc: string;
	title: string;
	subtitle: string;
	toothCode?: string | undefined;
	zoom: number;
	panX: number;
	panY: number;
	invert: boolean;
	sharpness: boolean;
	annotations: ViewportAnnotation[];
}

export type ConsultationSlot = "left" | "right";

/**
 * Draws an anti-aliased vector arrow with filled arrowhead.
 */
export function drawVectorArrow(
	ctx: CanvasRenderingContext2D,
	from: { x: number; y: number },
	to: { x: number; y: number },
	headLength = 12,
): void {
	ctx.beginPath();
	ctx.moveTo(from.x, from.y);
	ctx.lineTo(to.x, to.y);
	ctx.stroke();

	const angle = Math.atan2(to.y - from.y, to.x - from.x);
	ctx.beginPath();
	ctx.moveTo(to.x, to.y);
	ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
	ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
	ctx.closePath();
	ctx.fill();
}

/**
 * Projects screen/client coordinates back to image coordinate plane.
 */
export function getImageCoords(
	canvas: HTMLCanvasElement,
	state: Pick<ViewportState, "panX" | "panY" | "zoom">,
	naturalDimensions: { width: number; height: number },
	clientX: number,
	clientY: number,
): { x: number; y: number } {
	const rect = canvas.getBoundingClientRect();
	const imgW = naturalDimensions.width || 400;
	const imgH = naturalDimensions.height || 400;

	const screenX = clientX - rect.left;
	const screenY = clientY - rect.top;

	const imgX = (screenX - (canvas.width / 2 + state.panX)) / state.zoom + imgW / 2;
	const imgY = (screenY - (canvas.height / 2 + state.panY)) / state.zoom + imgH / 2;
	return { x: imgX, y: imgY };
}

/**
 * Renders viewport image and annotations to HTML5 Canvas.
 * Uses medium-slate (#1e293b) background matching EzDent-i Screenshot 25.
 */
export function renderViewportToCanvas(params: {
	canvas: HTMLCanvasElement | null;
	img: HTMLImageElement | null;
	state: ViewportState;
	isActive: boolean;
	draftPoints?: readonly { x: number; y: number }[];
	activeTool?: string;
	annotationColor?: string;
}): void {
	const { canvas, img, state, isActive, draftPoints = [], activeTool, annotationColor = "#ef4444" } = params;
	if (!canvas || !img || img.naturalWidth === 0) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	canvas.width = canvas.parentElement?.clientWidth || 400;
	canvas.height = canvas.parentElement?.clientHeight || 400;

	ctx.save();
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Neutral slate background matching EzDent-i Screenshot 25
	ctx.fillStyle = "#1e293b";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Transformation matrix
	ctx.translate(canvas.width / 2 + state.panX, canvas.height / 2 + state.panY);
	ctx.scale(state.zoom, state.zoom);
	ctx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";

	// Draw Image (with optional grayscale invert)
	if (state.invert) {
		ctx.filter = "invert(100%)";
	}
	ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
	ctx.filter = "none";

	// Draw Completed Annotations
	for (const ann of state.annotations) {
		ctx.strokeStyle = ann.color;
		ctx.fillStyle = ann.color;
		ctx.lineWidth = 3 / state.zoom;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		if (ann.type === "freehand" && ann.points.length > 1) {
			ctx.beginPath();
			ctx.moveTo(ann.points[0]!.x, ann.points[0]!.y);
			for (let i = 1; i < ann.points.length; i++) {
				ctx.lineTo(ann.points[i]!.x, ann.points[i]!.y);
			}
			ctx.stroke();
		} else if (ann.type === "arrow" && ann.points.length >= 2) {
			const p1 = ann.points[0]!;
			const p2 = ann.points[ann.points.length - 1]!;
			drawVectorArrow(ctx, p1, p2, 14 / state.zoom);
		}
	}

	// Draw In-Progress Draft Annotation
	if (isActive && draftPoints.length > 0) {
		ctx.strokeStyle = annotationColor;
		ctx.fillStyle = annotationColor;
		ctx.lineWidth = 3 / state.zoom;
		ctx.lineCap = "round";

		if (activeTool === "pencil" && draftPoints.length > 1) {
			ctx.beginPath();
			ctx.moveTo(draftPoints[0]!.x, draftPoints[0]!.y);
			for (let i = 1; i < draftPoints.length; i++) {
				ctx.lineTo(draftPoints[i]!.x, draftPoints[i]!.y);
			}
			ctx.stroke();
		} else if (activeTool === "arrow" && draftPoints.length >= 2) {
			drawVectorArrow(ctx, draftPoints[0]!, draftPoints[draftPoints.length - 1]!, 14 / state.zoom);
		}
	}

	ctx.restore();
}

/**
 * Combines Left and Right viewports into a single composite PNG data URL.
 * Emulates the EzDent-i Snapshot (Camera) tool in Screenshot 25.
 */
export function captureCompositeSnapshot(params: {
	leftCanvas: HTMLCanvasElement | null;
	rightCanvas: HTMLCanvasElement | null;
	leftTitle: string;
	rightTitle: string;
	patientName?: string;
	patientCardNumber?: string;
}): string | null {
	const { leftCanvas, rightCanvas, leftTitle, rightTitle, patientName, patientCardNumber } = params;
	if (!leftCanvas || !rightCanvas) return null;

	const gap = 12;
	const headerHeight = 44;
	const totalWidth = leftCanvas.width + rightCanvas.width + gap + 16;
	const maxViewportHeight = Math.max(leftCanvas.height, rightCanvas.height);
	const totalHeight = maxViewportHeight + headerHeight + 16;

	const compCanvas = document.createElement("canvas");
	compCanvas.width = totalWidth;
	compCanvas.height = totalHeight;
	const ctx = compCanvas.getContext("2d");
	if (!ctx) return null;

	// Background
	ctx.fillStyle = "#020617";
	ctx.fillRect(0, 0, totalWidth, totalHeight);

	// Header Banner
	ctx.fillStyle = "#070b14";
	ctx.fillRect(0, 0, totalWidth, headerHeight);

	ctx.fillStyle = "#00C853";
	ctx.font = "bold 13px sans-serif";
	ctx.fillText("EzDent-i КОНСУЛЬТАЦИЯ · СРАВНИТЕЛЬНЫЙ СПЛИТ", 12, 26);

	ctx.fillStyle = "#94a3b8";
	ctx.font = "11px sans-serif";
	const metaStr = `${patientCardNumber || ""} ${patientName || ""} · ${new Date().toLocaleString("ru-RU")}`;
	ctx.fillText(metaStr, totalWidth - ctx.measureText(metaStr).width - 12, 26);

	// Draw Left Canvas
	const leftX = 8;
	const viewY = headerHeight + 8;
	ctx.drawImage(leftCanvas, leftX, viewY);

	// Draw Right Canvas
	const rightX = leftX + leftCanvas.width + gap;
	ctx.drawImage(rightCanvas, rightX, viewY);

	// Viewport Title badges
	ctx.fillStyle = "rgba(7, 11, 20, 0.85)";
	ctx.fillRect(leftX + 8, viewY + 8, ctx.measureText(leftTitle).width + 24, 22);
	ctx.fillStyle = "#34d399";
	ctx.font = "bold 11px sans-serif";
	ctx.fillText(leftTitle, leftX + 16, viewY + 23);

	ctx.fillStyle = "rgba(7, 11, 20, 0.85)";
	ctx.fillRect(rightX + 8, viewY + 8, ctx.measureText(rightTitle).width + 24, 22);
	ctx.fillStyle = "#38bdf8";
	ctx.font = "bold 11px sans-serif";
	ctx.fillText(rightTitle, rightX + 16, viewY + 23);

	return compCanvas.toDataURL("image/png");
}
