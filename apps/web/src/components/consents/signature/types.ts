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

export interface SignatureStrokeTracker {
	startStroke: (point: SignaturePoint) => void;
	addPoint: (point: SignaturePoint) => SignaturePoint;
	endStroke: () => SignatureStroke | null;
	getStrokes: () => SignatureStroke[];
	getCurrentPoints: () => SignaturePoint[];
	clear: () => void;
	dispose: () => void;
}
