import type { CSSProperties } from 'react';
import { clamp } from '../photoProtocolMath';

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

export function calculateImageTransformStyle(options: LayerTransformOptions): CSSProperties {
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
