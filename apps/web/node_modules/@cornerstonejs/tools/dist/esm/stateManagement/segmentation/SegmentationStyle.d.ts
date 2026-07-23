import type { SegmentationRepresentations } from '../../enums';
import type { BaseContourStyle, ContourStyle } from '../../types/ContourTypes';
import type { BaseLabelmapStyle, LabelmapStyle } from '../../types/LabelmapTypes';
import type { SurfaceStyle } from '../../types/SurfaceTypes';
export type RepresentationStyle = LabelmapStyle | ContourStyle | SurfaceStyle;
export type BaseRepresentationStyle = BaseLabelmapStyle | BaseContourStyle;
declare class SegmentationStyle {
    private config;
    constructor();
    setStyle(specifier: {
        type: SegmentationRepresentations;
        viewportId?: string;
        segmentationId?: string;
        segmentIndex?: number;
    }, styles: RepresentationStyle, merge?: boolean): void;
    private copyActiveToInactiveIfNotProvided;
    getStyle(specifier: {
        viewportId?: string;
        segmentationId?: string;
        type?: SegmentationRepresentations;
        segmentIndex?: number;
    }): RepresentationStyle;
    getRenderInactiveSegmentations(viewportId: string): boolean;
    setRenderInactiveSegmentations(viewportId: string, renderInactiveSegmentations: boolean): void;
    private getDefaultStyle;
    clearSegmentationStyle(segmentationId: string): void;
    clearAllSegmentationStyles(): void;
    clearViewportStyle(viewportId: string): void;
    clearAllViewportStyles(): void;
    resetToGlobalStyle(): void;
    hasCustomStyle(specifier: {
        viewportId?: string;
        segmentationId?: string;
        type?: SegmentationRepresentations;
        segmentIndex?: number;
    }): boolean;
}
declare const segmentationStyle: SegmentationStyle;
export { segmentationStyle };
