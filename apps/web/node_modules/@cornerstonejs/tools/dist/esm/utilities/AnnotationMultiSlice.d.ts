import type { Annotation } from '../types';
export type FramesRange = [number, number] | number;
export default class AnnotationMultiSlice {
    static setStartRange(viewport: any, annotation: any, startRange?: any): void;
    static setEndRange(viewport: any, annotation: any, endRange?: any): void;
    static setRange(viewport: any, annotation: any, startRange?: number, endRange?: number): void;
    static setSingle(viewport: any, annotation: any, current?: any): void;
    static getFrameRange(annotation: Annotation): number | [number, number];
    static getFrameRangeStr(annotation: Annotation): string;
    static setViewportFrameRange(viewport: any, specifier: any): void;
}
