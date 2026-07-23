import BrushStrategy from './BrushStrategy';
declare const RECTANGLE_STRATEGY: BrushStrategy;
declare const RECTANGLE_THRESHOLD_STRATEGY: BrushStrategy;
declare const fillInsideRectangle: (enabledElement: any, operationData: any) => unknown;
declare const thresholdInsideRectangle: (enabledElement: any, operationData: any) => unknown;
export { RECTANGLE_STRATEGY, RECTANGLE_THRESHOLD_STRATEGY, fillInsideRectangle, thresholdInsideRectangle, };
