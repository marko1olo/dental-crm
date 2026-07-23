import type SegmentationRepresentations from '../../../enums/SegmentationRepresentations';
import type { ContourStyle } from '../../../types/ContourTypes';
import type { LabelmapStyle } from '../../../types/LabelmapTypes';
import type { SurfaceStyle } from '../../../types/SurfaceTypes';
type BaseSpecifier = {
    viewportId?: string;
    segmentationId?: string;
    segmentIndex?: number;
};
type SpecifierWithType<T extends SegmentationRepresentations> = BaseSpecifier & {
    type: T;
};
type StyleForType<T extends SegmentationRepresentations> = T extends SegmentationRepresentations.Labelmap ? LabelmapStyle : T extends SegmentationRepresentations.Contour ? ContourStyle : T extends SegmentationRepresentations.Surface ? SurfaceStyle : never;
declare function getStyle<T extends SegmentationRepresentations>(specifier: SpecifierWithType<T>): StyleForType<T>;
declare function setStyle<T extends SegmentationRepresentations>(specifier: SpecifierWithType<T>, style: StyleForType<T>, merge?: boolean): void;
declare function setRenderInactiveSegmentations(viewportId: string, renderInactiveSegmentations: boolean): void;
declare function getRenderInactiveSegmentations(viewportId: string): boolean;
declare function resetToGlobalStyle(): void;
declare function hasCustomStyle(specifier: {
    viewportId?: string;
    segmentationId?: string;
    type?: SegmentationRepresentations;
    segmentIndex?: number;
}): boolean;
export { getStyle, setStyle, setRenderInactiveSegmentations, getRenderInactiveSegmentations, resetToGlobalStyle, hasCustomStyle, };
