import { Point2D, Transform2D, vector, vectorLength, radiansToDegrees, clamp } from './vectorGeometry';
import type { ColorRGB } from '../vitaShadesCatalog';

export function calculateSplitClipPath(
	sliderPercent: number,
	direction: 'vertical' | 'horizontal' = 'vertical'
): string {
	const safePercent = Number.isFinite(sliderPercent) ? sliderPercent : 50;
	const clamped = clamp(safePercent, 0, 100);
	if (direction === 'vertical') {
		return `polygon(${clamped}% 0%, 100% 0%, 100% 100%, ${clamped}% 100%)`;
	} else {
		return `polygon(0% ${clamped}%, 100% ${clamped}%, 100% 100%, 0% ${clamped}%)`;
	}
}

export function calculateSimilarityTransform(
	beforePoints: [Point2D, Point2D],
	afterPoints: [Point2D, Point2D]
): Transform2D {
	const [b1, b2] = beforePoints;
	const [a1, a2] = afterPoints;

	const bVec = vector(b1, b2);
	const aVec = vector(a1, a2);

	const bLen = vectorLength(bVec);
	const aLen = vectorLength(aVec);

	if (aLen === 0 || bLen === 0 || !Number.isFinite(aLen) || !Number.isFinite(bLen)) {
		return { translateX: 0, translateY: 0, scale: 1, rotationDegrees: 0 };
	}

	const scale = bLen / aLen;
	const bAngle = Math.atan2(bVec.y, bVec.x);
	const aAngle = Math.atan2(aVec.y, aVec.x);
	const rotRad = bAngle - aAngle;
	const rotationDegrees = radiansToDegrees(rotRad);

	const bMid = { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 };
	const aMid = { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2 };

	const cosR = Math.cos(rotRad);
	const sinR = Math.sin(rotRad);
	const aMidRotX = (aMid.x * cosR - aMid.y * sinR) * scale;
	const aMidRotY = (aMid.x * sinR + aMid.y * cosR) * scale;

	const translateX = bMid.x - aMidRotX;
	const translateY = bMid.y - aMidRotY;

	return { translateX, translateY, scale, rotationDegrees };
}

export function calculateBlendDifferenceScore(rgbA: ColorRGB, rgbB: ColorRGB): number {
	const dr = rgbA.r - rgbB.r;
	const dg = rgbA.g - rgbB.g;
	const db = rgbA.b - rgbB.b;
	return Math.sqrt(dr * dr + dg * dg + db * db) / 441.67;
}

export function calculateWiperWheelDelta(
	currentPercent: number,
	wheelDeltaY: number,
	stepPercent = 2
): number {
	const direction = wheelDeltaY > 0 ? 1 : -1;
	return clamp(Math.round(currentPercent + direction * stepPercent), 0, 100);
}

export function calculateKeyboardWiperDelta(
	currentPercent: number,
	key: string,
	shiftKey = false
): number {
	const step = shiftKey ? 5 : 1;
	switch (key) {
		case 'ArrowLeft':
		case 'ArrowUp':
			return clamp(currentPercent - step, 0, 100);
		case 'ArrowRight':
		case 'ArrowDown':
			return clamp(currentPercent + step, 0, 100);
		case 'Home':
			return 0;
		case 'End':
			return 100;
		default:
			return currentPercent;
	}
}

export interface SliderPointerOptions {
	readonly clientX: number;
	readonly clientY: number;
	readonly containerRect: {
		readonly left: number;
		readonly top: number;
		readonly width: number;
		readonly height: number;
	};
	readonly direction?: 'vertical' | 'horizontal';
}

export function calculatePointerPercent(options: SliderPointerOptions): number {
	const { clientX, clientY, containerRect, direction = 'vertical' } = options;
	if (direction === 'vertical') {
		if (containerRect.width <= 0) return 50;
		const relativeX = clientX - containerRect.left;
		const pct = (relativeX / containerRect.width) * 100;
		return Math.round(clamp(pct, 0, 100));
	} else {
		if (containerRect.height <= 0) return 50;
		const relativeY = clientY - containerRect.top;
		const pct = (relativeY / containerRect.height) * 100;
		return Math.round(clamp(pct, 0, 100));
	}
}

export interface LayerTransformOptions {
	readonly zoom?: number;
	readonly rotationDegrees?: number;
	readonly panX?: number;
	readonly panY?: number;
	readonly flipHorizontal?: boolean;
	readonly flipVertical?: boolean;
}

export function calculateImageTransformStyle(options: LayerTransformOptions): Record<string, string> {
	const zoom = options.zoom ?? 1.0;
	const rot = options.rotationDegrees ?? 0;
	const px = options.panX ?? 0;
	const py = options.panY ?? 0;
	const scaleX = options.flipHorizontal ? -1 : 1;
	const scaleY = options.flipVertical ? -1 : 1;

	const transform = `scale(${zoom}) rotate(${rot}deg) translate(${px}px, ${py}px) scale(${scaleX}, ${scaleY})`;

	return {
		transform,
		transformOrigin: 'center center',
		transition: 'transform 0.05s linear',
	};
}
