/**
 * Clinical Dental Photography & Photo Protocol Domain Module
 */

export * from './photoGridPresets';
export {
	clamp,
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

export * from './PhotoSlotCard';
export * from './PhotoGridSixSlots';
export * from './BeforeAfterSplitSlider';
export * from './LabPhotoExportDrawer';
export * from './VitaShadeSelector';
export * from './VitaStratificationPanel';
export * from './VitaShadeSwatches';
export * from './BeforeAfterComparisonView';
export * from './PhotoCalibrationDrawer';
export * from './ClinicalPhotoProtocolModal';
export * from './photoProtocolEngine';
export * from './chairsidePhotoCompressor';
export * from './useClipboardPhotoPaste';
export * from './IntraoralCameraModal';
export * from '../visit/BeforeAfterSplitter';
export * from './dsd/DsdAestheticStudioModal';
export * from './dsd/DsdCanvasOverlay';
export * from './dsd/DsdMetricsSidebar';
