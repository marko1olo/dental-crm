/**
 * photoProtocolEngine.ts — Clinical Photo Protocol & Before/After Comparison Engine (@dental/web)
 *
 * Compliant with:
 * - Mandate 8bd (Scout Dossier: elimination of duplicate engine files)
 * - Mandate 8aq (Unified exports)
 * - Layer 5 Barrel delegating to @dental/shared/diagnostics/photoProtocol (SSOT)
 */

export * from '@dental/shared';
export * from './standard8Angles';
export * from './collage/collageTypes';
export * from './collage/printableHtmlTemplate';
export * from './collage/collageExportActions';

export {
	calculateSplitClipPath,
	calculateSimilarityTransform,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	calculatePointerPercent,
	calculateImageTransformStyle,
	calculateCollageDimensions,
	generateCollageWatermarkText,
	type Point2D,
	type Transform2D,
	type CollageFormatType,
	type CollageDimensionConfig,
	type SliderPointerOptions,
	type LayerTransformOptions,
} from './photoProtocolMath';

export {
	loadImageSafe,
	exportProtocolGridAsPng,
	type ProtocolGridExportPayload,
} from './photoProtocolGridExport';
