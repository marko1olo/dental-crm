/**
 * DENTE Dental CRM — Shared SVG Odontogram Geometry Contracts
 * Foundational mathematical and graphical primitives for 32-tooth odontogram.
 * Mandate 8b <= 120 lines.
 */

export interface Point2D {
	readonly x: number;
	readonly y: number;
}

export interface SvgPathItem {
	readonly id: string;
	readonly d: string;
}

export interface SvgEllipseItem {
	readonly id: string;
	readonly cx: number;
	readonly cy: number;
	readonly rx: number;
	readonly ry: number;
	readonly angle: number;
}

export interface ToothBounds {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface CejCurveGeometry {
	readonly cejLine: string;
	readonly mesialPoint?: Point2D | undefined;
	readonly distalPoint?: Point2D | undefined;
}
