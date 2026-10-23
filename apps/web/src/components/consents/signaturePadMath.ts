/**
 * DIGITAL TOUCH-SIGNATURE & INTEGRITY ENGINE
 * Реэкспорт математических, векторных и рендер-функций цифровой подписи
 */

export type {
	SignaturePoint,
	SignatureStroke,
	SignatureBoundingBox,
	SignatureVectorData,
	BezierCurveSegment,
	StrokeWidthOptions,
	SignatureStrokeTracker,
} from "./signature/types";

export {
	calculatePointDistance,
	calculatePointVelocity,
	calculateStrokeWidth,
	computeMidpoint,
	calculateBoundingBox,
	isSignatureEmpty,
} from "./signature/geometry";

export {
	smoothStrokeToBezierCurves,
	simplifyStrokePoints,
} from "./signature/curves";

export {
	renderStrokeToSvgPath,
	exportSignatureToSvg,
} from "./signature/svg";

export {
	setupCanvasHighDpi,
	getPointerCoordinates,
	drawSmoothStrokeOnContext,
	drawAllStrokesOnCanvas,
	exportSignatureToPng,
} from "./signature/canvas";

export {
	createStrokeTracker,
} from "./signature/tracker";

export {
	generateSha256,
	type ConsentIntegrityPayload,
	generatePaperSignatureSvg,
	generateSmsPepSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
	generateConsentIntegrityHash,
} from "./consentIntegrityHash";

export {
	type ConsentPdfAOptions,
	escapeXml,
	escapePdfString,
	transliterateRussianToAscii,
	generatePdfA1bDocument,
	downloadConsentPdfA,
} from "./consentPdfAEngine";
