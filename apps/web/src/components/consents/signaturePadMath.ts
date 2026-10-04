/**
 * ============================================================================
 * DIGITAL TOUCH-SIGNATURE & INTEGRITY ENGINE
 * Модуль криптографического хеширования SHA-256 (FIPS 180-4), генерации цифрового
 * отпечатка информированного согласия и векторного подтверждения на бумажном носителе.
 * Упразднены неиспользуемые физические симуляторы нажатия Apple Pencil (Мандаты 8e, 8k, 8n).
 * ============================================================================
 */

import { PAPER_SIGNATURE_FALLBACK_PNG } from "./consentIntegrityHash";

export interface SignaturePoint {
	x: number;
	y: number;
	time: number;
	pressure?: number | undefined;
	width?: number | undefined;
}

export interface SignatureStroke {
	points: SignaturePoint[];
	color?: string | undefined;
	width?: number | undefined;
	isDot?: boolean | undefined;
}

export interface SignatureBoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	width: number;
	height: number;
}

export interface SignatureVectorData {
	strokes: SignatureStroke[];
	bounds: SignatureBoundingBox;
	timestamp: number;
	pointCount: number;
	integrityHash?: string | undefined;
}

export interface BezierCurveSegment {
	startPoint: SignaturePoint;
	control1: SignaturePoint;
	control2: SignaturePoint;
	endPoint: SignaturePoint;
	startWidth: number;
	endWidth: number;
}

export interface StrokeWidthOptions {
	minWidth?: number | undefined;
	maxWidth?: number | undefined;
	velocityFilterWeight?: number | undefined;
	pressureWeight?: number | undefined;
}

const DEFAULT_MIN_WIDTH = 1.2;
const DEFAULT_MAX_WIDTH = 3.5;
const DEFAULT_VELOCITY_WEIGHT = 0.7;

/**
 * Вычисление евклидова расстояния между двумя точками
 */
export function calculatePointDistance(p1: SignaturePoint, p2: SignaturePoint): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Вычисление скорости движения пера (px/ms)
 */
export function calculatePointVelocity(p1: SignaturePoint, p2: SignaturePoint): number {
	const timeDelta = Math.max(p2.time - p1.time, 1);
	const distance = calculatePointDistance(p1, p2);
	return distance / timeDelta;
}

/**
 * Расчет базовой толщины штриха по скорости движения (Apple Pencil pressure physics упразднены)
 */
export function calculateStrokeWidth(
	velocity: number,
	_pressure?: number | undefined,
	options: StrokeWidthOptions = {},
): number {
	const minWidth = options.minWidth ?? DEFAULT_MIN_WIDTH;
	const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;

	// v = 0 -> maxWidth, v >= 3.0 -> minWidth
	const normalizedVelocity = Math.min(Math.max(velocity, 0), 3.0) / 3.0;
	const width = maxWidth - (maxWidth - minWidth) * Math.pow(normalizedVelocity, 0.6);
	return Math.min(maxWidth, Math.max(minWidth, width));
}

/**
 * Вычисление средней точки между двумя координатами
 */
export function computeMidpoint(p1: SignaturePoint, p2: SignaturePoint): SignaturePoint {
	return {
		x: (p1.x + p2.x) / 2,
		y: (p1.y + p2.y) / 2,
		time: (p1.time + p2.time) / 2,
		pressure: p1.pressure !== undefined && p2.pressure !== undefined ? (p1.pressure + p2.pressure) / 2 : undefined,
		width: p1.width !== undefined && p2.width !== undefined ? (p1.width + p2.width) / 2 : undefined,
	};
}

/**
 * Сглаживание массива точек в сегменты кубических/квадратичных кривых Безье
 */
export function smoothStrokeToBezierCurves(
	points: SignaturePoint[],
	options: StrokeWidthOptions = {},
): BezierCurveSegment[] {
	if (points.length < 2) return [];

	const minWidth = options.minWidth ?? DEFAULT_MIN_WIDTH;
	const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
	const curves: BezierCurveSegment[] = [];

	const first = points[0];
	const second = points[1];
	if (!first || !second) return [];

	if (points.length === 2) {
		const v = calculatePointVelocity(first, second);
		const w = calculateStrokeWidth(v, undefined, options);
		curves.push({
			startPoint: first,
			control1: first,
			control2: second,
			endPoint: second,
			startWidth: first.width ?? (minWidth + maxWidth) / 2,
			endWidth: w,
		});
		return curves;
	}

	let currentWidth = first.width ?? (minWidth + maxWidth) / 2;

	for (let i = 1; i < points.length - 1; i++) {
		const p0 = points[i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		if (!p0 || !p1 || !p2) continue;

		const mid1 = computeMidpoint(p0, p1);
		const mid2 = computeMidpoint(p1, p2);

		const v = calculatePointVelocity(p0, p1);
		const targetWidth = calculateStrokeWidth(v, undefined, options);
		const weight = options.velocityFilterWeight ?? DEFAULT_VELOCITY_WEIGHT;
		const nextWidth = currentWidth * (1 - weight) + targetWidth * weight;

		curves.push({
			startPoint: mid1,
			control1: p1,
			control2: p1,
			endPoint: mid2,
			startWidth: currentWidth,
			endWidth: nextWidth,
		});

		currentWidth = nextWidth;
	}

	return curves;
}

/**
 * Упрощение точек штриха методом Рамера — Дугласа — Пекера
 */
export function simplifyStrokePoints(points: SignaturePoint[], tolerance = 1.0): SignaturePoint[] {
	if (points.length <= 2) return points;

	const pStart = points[0];
	const pEnd = points[points.length - 1];
	if (!pStart || !pEnd) return points;

	let maxDistance = 0;
	let maxIndex = 0;

	const lineLength = calculatePointDistance(pStart, pEnd);

	for (let i = 1; i < points.length - 1; i++) {
		const p = points[i];
		if (!p) continue;
		let distance = 0;

		if (lineLength === 0) {
			distance = calculatePointDistance(p, pStart);
		} else {
			const numerator = Math.abs(
				(pEnd.y - pStart.y) * p.x - (pEnd.x - pStart.x) * p.y + pEnd.x * pStart.y - pEnd.y * pStart.x,
			);
			distance = numerator / lineLength;
		}

		if (distance > maxDistance) {
			maxDistance = distance;
			maxIndex = i;
		}
	}

	if (maxDistance > tolerance) {
		const left = simplifyStrokePoints(points.slice(0, maxIndex + 1), tolerance);
		const right = simplifyStrokePoints(points.slice(maxIndex), tolerance);
		return [...left.slice(0, -1), ...right];
	}

	return [pStart, pEnd];
}

/**
 * Вычисление ограничивающего прямоугольника (Bounding Box) подписи
 */
export function calculateBoundingBox(strokes: SignatureStroke[]): SignatureBoundingBox {
	if (!strokes || strokes.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	let hasPoints = false;

	for (const stroke of strokes) {
		for (const point of stroke.points) {
			hasPoints = true;
			if (point.x < minX) minX = point.x;
			if (point.y < minY) minY = point.y;
			if (point.x > maxX) maxX = point.x;
			if (point.y > maxY) maxY = point.y;
		}
	}

	if (!hasPoints) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}

	return {
		minX: Math.floor(minX),
		minY: Math.floor(minY),
		maxX: Math.ceil(maxX),
		maxY: Math.ceil(maxY),
		width: Math.max(0, Math.ceil(maxX) - Math.floor(minX)),
		height: Math.max(0, Math.ceil(maxY) - Math.floor(minY)),
	};
}

/**
 * Проверка, является ли подпись пустой или недостаточной
 */
export function isSignatureEmpty(strokes: SignatureStroke[], minPointsThreshold = 5): boolean {
	if (!strokes || strokes.length === 0) return true;
	let totalPoints = 0;
	for (const stroke of strokes) {
		totalPoints += stroke.points.length;
	}
	return totalPoints < minPointsThreshold;
}

/**
 * Построение сглаженного SVG path (d-атрибута) квадратичными кривыми Безье через средние точки.
 * Обеспечивает непрерывность кривизны G1 от первой до последней точки росчерка.
 */
export function renderStrokeToSvgPath(points: SignaturePoint[]): string {
	if (!points || points.length === 0) return "";
	const first = points[0];
	if (!first) return "";
	if (points.length === 1) {
		return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
	}
	if (points.length === 2) {
		const second = points[1];
		if (!second) return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
		return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} L ${second.x.toFixed(2)} ${second.y.toFixed(2)}`;
	}

	let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
	for (let i = 1; i < points.length - 1; i++) {
		const current = points[i];
		const next = points[i + 1];
		if (!current || !next) continue;
		const mid = computeMidpoint(current, next);
		path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)}, ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`;
	}
	const last = points[points.length - 1];
	if (last) {
		path += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
	}
	return path;
}

/**
 * Экспорт подписи в векторный формат SVG с кривыми Безье
 */
export function exportSignatureToSvg(
	strokes: SignatureStroke[],
	width: number,
	height: number,
	options: {
		strokeColor?: string | undefined;
		strokeWidth?: number | undefined;
		backgroundColor?: string | undefined;
		viewBox?: string | undefined;
	} = {},
): string {
	const strokeColor = options.strokeColor || "#0f172a";
	const bg = options.backgroundColor ? `<rect width="100%" height="100%" fill="${options.backgroundColor}"/>` : "";
	const pathStrings: string[] = [];

	for (const stroke of strokes) {
		const points = stroke.points;
		if (!points || points.length === 0) continue;

		const first = points[0];
		if (!first) continue;

		if (points.length === 1 || stroke.isDot) {
			const r = (options.strokeWidth ?? DEFAULT_MAX_WIDTH) / 2;
			pathStrings.push(`<circle cx="${first.x.toFixed(2)}" cy="${first.y.toFixed(2)}" r="${r.toFixed(2)}" fill="${strokeColor}"/>`);
			continue;
		}

		if (points.length === 2) {
			const second = points[1];
			if (!second) continue;
			pathStrings.push(
				`<path d="M ${first.x.toFixed(2)} ${first.y.toFixed(2)} L ${second.x.toFixed(2)} ${second.y.toFixed(2)}" stroke="${strokeColor}" stroke-width="${(options.strokeWidth ?? DEFAULT_MIN_WIDTH).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
			);
			continue;
		}

		const pathData = renderStrokeToSvgPath(points);
		const sw = stroke.width || options.strokeWidth || 2.2;
		pathStrings.push(
			`<path d="${pathData}" stroke="${strokeColor}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
		);
	}

	const vb = options.viewBox || `0 0 ${width} ${height}`;

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${width}" height="${height}">\n  ${bg}\n  ${pathStrings.join("\n  ")}\n</svg>`;
}

/**
 * Настройка холста HTMLCanvasElement для экранов с высокой плотностью пикселей (Retina / High-DPI).
 * Масштабирует внутренний буфер отрисовки с учетом devicePixelRatio, предотвращая размытие линий.
 */
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

/**
 * Извлечение нормализованных координат пера/пальца относительно элемента (Canvas или SVG).
 * Корректно учитывает getBoundingClientRect, скролл и координаты касаний/стилуса.
 */
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

/**
 * Отрисовка сглаженного штриха на контексте 2D холста (CanvasRenderingContext2D).
 */
export function drawSmoothStrokeOnContext(
	ctx: CanvasRenderingContext2D,
	stroke: SignatureStroke,
	options: StrokeWidthOptions & { defaultColor?: string | undefined } = {},
): void {
	const points = stroke.points;
	if (!points || points.length === 0) return;

	const first = points[0];
	if (!first) return;

	ctx.strokeStyle = stroke.color || options.defaultColor || "#0f172a";
	ctx.fillStyle = stroke.color || options.defaultColor || "#0f172a";
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	// Одиночная точка (клик / точка)
	if (points.length === 1 || stroke.isDot) {
		const radius = (options.maxWidth ?? DEFAULT_MAX_WIDTH) / 2;
		ctx.beginPath();
		ctx.arc(first.x, first.y, radius, 0, Math.PI * 2, true);
		ctx.fill();
		return;
	}

	// 2 точки — прямой отрезок
	if (points.length === 2) {
		const second = points[1];
		if (!second) return;
		ctx.lineWidth = stroke.width || (options.minWidth ?? DEFAULT_MIN_WIDTH);
		ctx.beginPath();
		ctx.moveTo(first.x, first.y);
		ctx.lineTo(second.x, second.y);
		ctx.stroke();
		return;
	}

	// 3+ точек — сглаженная кривая Безье
	ctx.lineWidth = stroke.width || 2.2;
	ctx.beginPath();
	ctx.moveTo(first.x, first.y);
	for (let i = 1; i < points.length - 1; i++) {
		const current = points[i];
		const next = points[i + 1];
		if (!current || !next) continue;
		const mid = computeMidpoint(current, next);
		ctx.quadraticCurveTo(current.x, current.y, mid.x, mid.y);
	}
	const last = points[points.length - 1];
	if (last) {
		ctx.lineTo(last.x, last.y);
	}
	ctx.stroke();
}

/**
 * Отрисовка всех штрихов на HTMLCanvasElement с заполнением фоновым цветом и поддержкой High-DPI.
 */
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

export interface SignatureStrokeTracker {
	startStroke: (point: SignaturePoint) => void;
	addPoint: (point: SignaturePoint) => SignaturePoint;
	endStroke: () => SignatureStroke | null;
	getStrokes: () => SignatureStroke[];
	getCurrentPoints: () => SignaturePoint[];
	clear: () => void;
	dispose: () => void;
}

/**
 * Менеджер сбора штрихов подписи без утечек памяти (Zero Memory Leaks).
 * Гарантирует очистку ссылок и предотвращение бесконечного роста буфера.
 */
export function createStrokeTracker(options: { maxPointsPerStroke?: number; defaultColor?: string } = {}): SignatureStrokeTracker {
	const maxPoints = options.maxPointsPerStroke ?? 2000;
	let strokes: SignatureStroke[] = [];
	let currentPoints: SignaturePoint[] = [];

	return {
		startStroke(point: SignaturePoint) {
			currentPoints = [point];
		},
		addPoint(point: SignaturePoint): SignaturePoint {
			if (currentPoints.length < maxPoints) {
				currentPoints.push(point);
			}
			return point;
		},
		endStroke(): SignatureStroke | null {
			if (currentPoints.length === 0) return null;
			const newStroke: SignatureStroke = {
				points: currentPoints,
				color: options.defaultColor || "#0f172a",
				isDot: currentPoints.length === 1,
			};
			strokes.push(newStroke);
			currentPoints = [];
			return newStroke;
		},
		getStrokes() {
			return [...strokes];
		},
		getCurrentPoints() {
			return [...currentPoints];
		},
		clear() {
			strokes = [];
			currentPoints = [];
		},
		dispose() {
			strokes.length = 0;
			currentPoints.length = 0;
			strokes = [];
			currentPoints = [];
		},
	};
}

/**
 * Экспорт подписи в формат PNG Base64 Data URL через внутренний холст.
 */
export function exportSignatureToPng(
	strokes: SignatureStroke[],
	width = 400,
	height = 140,
	options: {
		backgroundColor?: string | undefined;
		strokeColor?: string | undefined;
		dpr?: number | undefined;
	} = {},
): string {
	if (typeof document === "undefined") {
		return PAPER_SIGNATURE_FALLBACK_PNG;
	}
	try {
		const canvas = document.createElement("canvas");
		drawAllStrokesOnCanvas(canvas, strokes, {
			backgroundColor: options.backgroundColor ?? "#ffffff",
			defaultColor: options.strokeColor ?? "#0f172a",
			dpr: options.dpr ?? 1,
			width,
			height,
		});
		return canvas.toDataURL("image/png");
	} catch {
		return PAPER_SIGNATURE_FALLBACK_PNG;
	}
}

export { generateSha256, type ConsentIntegrityPayload, generatePaperSignatureSvg, generateSmsPepSignatureSvg, PAPER_SIGNATURE_FALLBACK_PNG, generateConsentIntegrityHash } from "./consentIntegrityHash";
export { type ConsentPdfAOptions, escapeXml, escapePdfString, transliterateRussianToAscii, generatePdfA1bDocument, downloadConsentPdfA } from "./consentPdfAEngine";
