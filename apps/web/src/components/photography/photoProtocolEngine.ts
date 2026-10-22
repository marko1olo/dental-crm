/**
 * photoProtocolEngine.ts — Clinical Photo Protocol & Before/After Comparison Engine (@dental/web)
 */

export * from './engine/anglesRegistry';
export * from './engine/scoringEngine';
export * from './engine/wiperSliderEngine';
export * from './engine/collageTypes';
export * from './engine/printableHtmlTemplate';
export * from './engine/collageExportActions';

export {
	calculateSplitClipPath,
	calculateSimilarityTransform,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	calculateCollageDimensions,
	generateCollageWatermarkText,
	type Point2D,
	type Transform2D,
	type CollageFormatType,
	type CollageDimensionConfig,
} from './photoProtocolMath';

export {
	loadImageSafe,
	exportProtocolGridAsPng,
	type ProtocolGridExportPayload,
} from './photoProtocolGridExport';
